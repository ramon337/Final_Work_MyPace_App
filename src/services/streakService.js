import { supabase } from '../lib/supabase';

/** --- HELPERS VOOR DATUMS (Tijdzone-veilig!) --- **/
const toDateString = (date) => {
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

    // 1. Haal op wanneer de crew is aangemaakt (Tijdzone-veilig!)
    const { data: crew } = await supabase.from('crews').select('created_at').eq('id', crewId).single();
    
    const getLocalYYYYMMDD = (isoString) => {
        if (!isoString) return '1970-01-01';
        const d = new Date(isoString);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d - offset).toISOString().split('T')[0];
    };
    const createdStr = getLocalYYYYMMDD(crew?.created_at); // Nu wordt donderdagavond UTC netjes Vrijdag lokaal!

    // 2. Bereken hoeveel 'geldige' dagen er in deze week zitten (sinds oprichting)
    let validDaysThisWeek = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        if (toDateString(d) >= createdStr) validDaysThisWeek++;
    }
    const prorateRatio = validDaysThisWeek / 7;

    const { data: existing } = await supabase
        .from('crew_daily_assignments')
        .select('*')
        .eq('crew_id', crewId)
        .gte('assignment_date', mondayStr)
        .lte('assignment_date', sundayStr)
        .order('assignment_date', { ascending: true });

    if (existing && existing.length === 7) return;

    // 3. Haal leden op en pas 'pro rata' doelen toe voor halve weken!
    const { data: members } = await supabase.from('crew_members').select('user_id, profiles(weekly_goal)').eq('crew_id', crewId);
    const goals = {};
    members?.forEach(m => { 
        const originalGoal = m.profiles?.weekly_goal || 2;
        goals[m.user_id] = Math.round(originalGoal * prorateRatio);
    });

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
                const currentDayStr = missingDates[i];
                
                // Als deze dag in de "lege" zone voor de oprichting valt, zet er NIEMAND op
                if (currentDayStr < createdStr) continue; 

                const currentDayObj = new Date(currentDayStr);
                const isMonday = currentDayObj.getDay() === 1;
                let score = 0;
                
                if (newDays[i].includes(userId)) score -= 1000; 
                score -= newDays[i].length * 10; 
                
                if (i > 0 && newDays[i-1].includes(userId)) score -= 50;
                if (i < daysToGenerate - 1 && newDays[i+1].includes(userId)) score -= 50;
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
        const isBeforeCreation = dateStr < createdStr;
        const isPast = dateStr < todayStr;
        
        return {
            crew_id: crewId,
            assignment_date: dateStr,
            assigned_users: isBeforeCreation ? [] : newDays[index],
            is_rest_day: isBeforeCreation ? false : newDays[index].length === 0,
            status: isPast ? 'completed' : 'pending'
        };
    });

    await supabase.from('crew_daily_assignments').insert(insertData);
};


/** --- 2. DE STARTMOTOR (Vul Huidige en Volgende week aan) --- **/
export const ensureFourteenDaySchedule = async (crewId) => {
    // 🚀 NIEUW: Check of de streak wel actief is (groter dan 0)
    const { data: crew } = await supabase.from('crews').select('current_streak').eq('id', crewId).single();
    
    if (!crew || crew.current_streak === 0) {
        console.log("[StreakEngine] Streak is 0. We wachten op de eerste run. Geen planning gegenereerd.");
        return; // We doen helemaal NIETS!
    }

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

    // 3. Vul volgende week aan
    await fillWeek(crewId, nextMonday, sundayUsers);
    
    console.log("[StreakEngine] Kalender t/m volgende week zondag staat veiliggesteld.");
};


/** --- 3. DE NOODKNOP (Voor als iemand de Crew verlaat of joint) --- **/
export const recalculateFutureSchedule = async (crewId) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateString(tomorrow);

    console.log(`[StreakEngine] Wijziging! Planning wordt herberekend vanaf ${tomorrowStr}.`);

    await supabase
        .from('crew_daily_assignments')
        .delete()
        .eq('crew_id', crewId)
        .gte('assignment_date', tomorrowStr);

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
            await supabase.from('crew_daily_assignments').update({ status: 'completed' }).eq('id', record.id);
            await supabase.from('crews').update({ current_streak: (crew.current_streak || 0) + 1 }).eq('id', crewId);
        } else if (crew?.rest_day_tokens > 0) {
            await supabase.from('crew_daily_assignments').update({ status: 'saved_by_token' }).eq('id', record.id);
            await supabase.from('crews').update({ rest_day_tokens: crew.rest_day_tokens - 1 }).eq('id', crewId);
        } else {
            // 🚀 STREAK BROKEN!
            await supabase.from('crew_daily_assignments').update({ status: 'failed' }).eq('id', record.id);
            await supabase.from('crews').update({ current_streak: 0 }).eq('id', crewId);
            
            // 🚀 NIEUW: Wis de planning voor vandaag en de toekomst, zodat we terug in de 'koudestart' fase zitten!
            const todayStr = toDateString(new Date());
            await supabase.from('crew_daily_assignments').delete().eq('crew_id', crewId).gte('assignment_date', todayStr);
        }
    }
};

/** --- 5. DE STRAVA VALIDATIE --- **/
export const checkAndProgressStreak = async (crewId, userId) => {
    const todayStr = toDateString(new Date());
    const { data: crew } = await supabase.from('crews').select('current_streak').eq('id', crewId).single();

    // 🚀 NIEUWE LOGICA: ALs de streak 0 is, fungeert deze run als de 'igniter'
    if (crew.current_streak === 0) {
        
        // Kijk of er stiekem al een record stond voor vandaag (bijv. van vroeger), zo ja overschrijf, anders maak nieuw
        const { data: existingToday } = await supabase.from('crew_daily_assignments')
            .select('id').eq('crew_id', crewId).eq('assignment_date', todayStr).maybeSingle();
        
        if (existingToday) {
            await supabase.from('crew_daily_assignments').update({
                assigned_users: [userId],
                completed_users: [userId],
                is_rest_day: false,
                status: 'completed'
            }).eq('id', existingToday.id);
        } else {
            await supabase.from('crew_daily_assignments').insert({
                crew_id: crewId,
                assignment_date: todayStr,
                assigned_users: [userId],
                completed_users: [userId],
                is_rest_day: false,
                status: 'completed'
            });
        }

        // 2. Zet de streak op 1!
        await supabase.from('crews').update({ current_streak: 1 }).eq('id', crewId);

        // 3. Nu de streak actief is, genereren we de rest van het rooster (vanaf morgen)
        await ensureFourteenDaySchedule(crewId);

        return { status: 'streak_started', newStreak: 1 };
    }

    // --- OUDE LOGICA VOOR ALS DE STREAK AL DRAAIT ---
    const { data: record } = await supabase.from('crew_daily_assignments').select('*')
        .eq('crew_id', crewId).eq('assignment_date', todayStr).maybeSingle();

    if (!record || record.status === 'completed' || record.is_rest_day) return { status: 'no_action_needed' };

    if (record.assigned_users.includes(userId) && !record.completed_users.includes(userId)) {
        const newCompleted = [...record.completed_users, userId];
        const isDayComplete = record.assigned_users.every(val => newCompleted.includes(val));

        if (isDayComplete) {
            await supabase.from('crew_daily_assignments').update({ completed_users: newCompleted, status: 'completed' }).eq('id', record.id);
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