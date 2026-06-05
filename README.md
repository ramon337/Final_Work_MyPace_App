# MyPace – Sociaal Hardloopplatform

MyPace is een innovatieve mobiele applicatie ontworpen voor de ‘Soft Mover’. De app draait niet om harde prestatiedata, maar om sociale verantwoordelijkheid en teamwork via een estafette-gebaseerde Relay Streak.

## Kernfunctionaliteiten

- Relay Streak: Houd de estafette levend met je Crew.
- Strava Integratie: Synchroniseer runs naadloos via OAuth2.
- Crew Quests: Werk samen aan epische uitdagingen, waarbij minuten tellen in plaats van snelheid.
- Buddy-Feedback: Dynamische animaties geven direct inzicht in de impact van jouw run op de streak.

## Mappenstructuur
- /assets: Statische bestanden (afbeeldingen, fonts, Lottie-animaties).
- /components: Herbruikbare UI-componenten.
- /context: Globaal state management (UserContext.js).
- /lib: Configuratie voor de Supabase client.
- /screens: App-schermen opgedeeld per user flow.
- /services: Externe bedrijfslogica en algoritmes (streakService.js).

## Installatie & Ontwikkeling

1. Vereisten
Zorg dat Node.js en npm op je systeem zijn geïnstalleerd.

2. Setup
Clone de repository en installeer alle benodigde packages:

git clone [https://github.com/ramon337/Final_Work_MyPace_App.git]
cd mypace-app
npm install

3. Starten
Start de ontwikkelomgeving via Expo:

npx expo start

Testen: Open de Expo Go app op je fysieke smartphone (iOS of Android) en scan de QR-code die in je terminal verschijnt. Zorg ervoor dat je telefoon en computer met hetzelfde wifi-netwerk zijn verbonden.

## Gebruikte Technologieën
Framework: React Native met Expo.
Database: Supabase.
Integraties: Strava API (OAuth2).
Animaties: Lottie React Native.
Navigatie: React Navigation (Stack & Bottom Tabs).

## useful sources
[getting to know react native](https://reactnative.dev/docs/tutorial)
[getting to know expo](https://youtu.be/0-S5a0eXPoc?si=VgUcWfueLcwiSFUA)
[converting SVG to Native](https://react-svgr.com/playground/?native=true)
[Lottie documentation](https://lottiefiles.github.io/lottie-docs/)

[AI chat I used throughout the whole project](https://gemini.google.com/share/94c82b3a4dfa)
