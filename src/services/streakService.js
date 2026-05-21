import { supabase } from '../lib/supabase';

/** --- HELPERS VOOR DATUMS (Tijdzone-veilig!) --- **/
const toDateString = (date) => {
    // Zorgt dat we de lokale datum krijgen, en niet per ongeluk gisteren vanwege UTC-tijd in Europa
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
};

const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};


/** --- 1. DE KALENDER GENERATOR (Bucket & Penalty Systeem) --- **/
const fillWeek = async (crewId, mondayDate, previousSundayUsers = []) => {
    const mondayStr = toDateString(mondayDate);
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayStr = toDateString(sundayDate);

    const { data: existing } = await supabase
        .from('crew_daily_assignments')
        .select('*')
        .eq('crew_id', crewId)
        .gte('assignment_date', mondayStr)
        .lte('assignment_date', sundayStr)
        .order('assignment_date', { ascending: true });

    if (existing && existing.length === 7) return;

    const { data: members } = await supabase.from('crew_members').select('user_id, profiles(weekly_goal)').eq('crew_id', crewId);
    const goals = {};
    members?.forEach(m => { goals[m.user_id] = m.profiles?.weekly_goal || 2; });

    const existingDates = [];
    existing?.forEach(record => {
        existingDates.push(record.assignment_date);
        record.assigned_users?.forEach(userId => { if (goals[userId]) goals[userId]--; });
    });

    const missingDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        const dStr = toDateString(d);
        if (!existingDates.includes(dStr)) missingDates.push(dStr);
    }

    if (missingDates.length === 0) return;

    const daysToGenerate = missingDates.length;
    const newDays = Array.from({ length: daysToGenerate }, () => ([]));
    const sortedUsers = Object.keys(goals).sort((a, b) => goals[b] - goals[a]);

    for (const userId of sortedUsers) {
        let runsToPlace = goals[userId];
        
        while (runsToPlace > 0) {
            let bestDay = -1;
            let bestScore = -Infinity;

            for (let i = 0; i < daysToGenerate; i++) {
                const currentDayObj = new Date(missingDates[i]);
                const isMonday = currentDayObj.getDay() === 1;
                let score = 0;
                
                if (newDays[i].includes(userId)) score -= 1000; 
                score -= newDays[i].length * 10; 
                
                if (i > 0 && newDays[i-1].includes(userId)) score -= 50;
                if (i < daysToGenerate - 1 && newDays[i+1].includes(userId)) score -= 50;

                // 🚀 NIEUW: De brug tussen zondag (week 1) en maandag (week 2)
                if (isMonday && previousSundayUsers.includes(userId)) score -= 50;
                
                score += Math.random();

                if (score > bestScore) {
                    bestScore = score;
                    bestDay = i;
                }
            }

            if (bestDay !== -1) {
                newDays[bestDay].push(userId);
                runsToPlace--;
            } else break;
        }
    }
const todayStr = toDateString(new Date());
    
    const insertData = missingDates.map((dateStr, index) => {
        const isPast = dateStr < todayStr; // Is deze ontbrekende dag al voorbij?
        return {
            crew_id: crewId,
            assignment_date: dateStr,
            assigned_users: isPast ? [] : newDays[index],
            is_rest_day: isPast ? true : newDays[index].length === 0,
            status: isPast ? 'completed' : 'pending' // Past days direct op 'completed' zetten!
        };
    });

    await supabase.from('crew_daily_assignments').insert(insertData);
};


/** --- 2. DE STARTMOTOR (Vul Huidige en Volgende week aan) --- **/
export const ensureFourteenDaySchedule = async (crewId) => {
    const today = new Date();
    const currentMonday = getMonday(today);
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);

    // 1. Vul deze week aan
    await fillWeek(crewId, currentMonday, []);
    
    // 2. Haal de lopers van de zondag van DEZE week op uit de database
    const sundayDate = new Date(currentMonday);
    sundayDate.setDate(currentMonday.getDate() + 6);
    
    const { data: sundayRecord } = await supabase
        .from('crew_daily_assignments')
        .select('assigned_users')
        .eq('crew_id', crewId)
        .eq('assignment_date', toDateString(sundayDate))
        .maybeSingle();

    const sundayUsers = sundayRecord?.assigned_users || [];

    // 3. Vul volgende week aan, en geef de zondag-lopers mee als "verboden op maandag"
    await fillWeek(crewId, nextMonday, sundayUsers);
    
    console.log("[StreakEngine] Kalender t/m volgende week zondag staat veiliggesteld zonder overlap.");
};


/** --- 3. DE NOODKNOP (Voor als iemand de Crew verlaat of joint) --- **/
export const recalculateFutureSchedule = async (crewId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateString(tomorrow);

    console.log(`[StreakEngine] Wijziging! Planning wordt herberekend vanaf ${tomorrowStr}.`);

    // 1. Verwijder alle planningen vanaf MORGEN (Vandaag en gisteren blijven bewaard!)
    await supabase
        .from('crew_daily_assignments')
        .delete()
        .eq('crew_id', crewId)
        .gte('assignment_date', tomorrowStr);

    // 2. Draai de startmotor opnieuw. Hij leest nu de nieuwe doelen, trekt de gemaakte runs 
    // van deze week eraf, en verspreidt de rest perfect over de overgebleven dagen!
    await ensureFourteenDaySchedule(crewId);
};


/** --- 4. DE NACHT-CHECK --- **/
export const processNachtCheck = async (crewId) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = toDateString(yesterday);

    const { data: record } = await supabase.from('crew_daily_assignments').select('*')
        .eq('crew_id', crewId).eq('assignment_date', dateStr).maybeSingle();

    if (record && record.status === 'pending') {
        const { data: crew } = await supabase.from('crews').select('rest_day_tokens, current_streak').eq('id', crewId).single();

        if (record.is_rest_day) {
            // AUTOMATISCHE WINST OP REST DAY (+1)
            await supabase.from('crew_daily_assignments').update({ status: 'completed' }).eq('id', record.id);
            await supabase.from('crews').update({ current_streak: (crew.current_streak || 0) + 1 }).eq('id', crewId);
        } else if (crew?.rest_day_tokens > 0) {
            // GERED DOOR TOKEN
            await supabase.from('crew_daily_assignments').update({ status: 'saved_by_token' }).eq('id', record.id);
            await supabase.from('crews').update({ rest_day_tokens: crew.rest_day_tokens - 1 }).eq('id', crewId);
        } else {
            // STREAK VERBROKEN
            await supabase.from('crew_daily_assignments').update({ status: 'failed' }).eq('id', record.id);
            await supabase.from('crews').update({ current_streak: 0 }).eq('id', crewId);
        }
    }
};

/** --- 5. DE STRAVA VALIDATIE --- **/
export const checkAndProgressStreak = async (crewId, userId) => {
    const todayStr = toDateString(new Date());

    const { data: record } = await supabase.from('crew_daily_assignments').select('*')
        .eq('crew_id', crewId).eq('assignment_date', todayStr).maybeSingle();

    if (!record || record.status === 'completed' || record.is_rest_day) return { status: 'no_action_needed' };

    if (record.assigned_users.includes(userId) && !record.completed_users.includes(userId)) {
        const newCompleted = [...record.completed_users, userId];
        const isDayComplete = record.assigned_users.every(val => newCompleted.includes(val));

        if (isDayComplete) {
            await supabase.from('crew_daily_assignments').update({ completed_users: newCompleted, status: 'completed' }).eq('id', record.id);
            const { data: crew } = await supabase.from('crews').select('current_streak').eq('id', crewId).single();
            const newStreak = (crew.current_streak || 0) + 1;
            await supabase.from('crews').update({ current_streak: newStreak }).eq('id', crewId);
            return { status: 'day_completed', newStreak };
        } else {
            await supabase.from('crew_daily_assignments').update({ completed_users: newCompleted }).eq('id', record.id);
            return { status: 'waiting_for_partner' };
        }
    }
    return { status: 'not_assigned_today' };
};