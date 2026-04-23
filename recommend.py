import requests

DESTINATIONS = {
    "ski": [
        {"name": "Poiana Brasov", "country": "Romania",     "emoji": "⛷️",  "lat": 45.6,   "lon": 25.55},
        {"name": "Sinaia",        "country": "Romania",     "emoji": "🎿",  "lat": 45.35,  "lon": 25.55},
        {"name": "Zermatt",       "country": "Switzerland", "emoji": "🏔️", "lat": 46.02,  "lon": 7.75},
        {"name": "Chamonix",      "country": "France",      "emoji": "⛷️",  "lat": 45.92,  "lon": 6.86},
        {"name": "Aspen",         "country": "USA",         "emoji": "🎿",  "lat": 39.19,  "lon": -106.82},
        {"name": "Whistler",      "country": "Canada",      "emoji": "⛷️",  "lat": 50.11,  "lon": -122.95},
    ],
    "beach": [
        {"name": "Mamaia",        "country": "Romania",     "emoji": "🏖️", "lat": 44.28,  "lon": 28.64},
        {"name": "Santorini",     "country": "Greece",      "emoji": "🌅", "lat": 36.39,  "lon": 25.46},
        {"name": "Maldives",      "country": "Maldives",    "emoji": "🌴", "lat": 3.20,   "lon": 73.22},
        {"name": "Bali",          "country": "Indonesia",   "emoji": "🏖️", "lat": -8.34,  "lon": 115.09},
        {"name": "Phuket",        "country": "Thailand",    "emoji": "🌴", "lat": 7.88,   "lon": 98.39},
        {"name": "Cancun",        "country": "Mexico",      "emoji": "🏖️", "lat": 21.16,  "lon": -86.85},
    ],
    "surfing": [
        {"name": "Costinesti",    "country": "Romania",     "emoji": "🏄", "lat": 43.92,  "lon": 28.64},
        {"name": "Nazare",        "country": "Portugal",    "emoji": "🌊", "lat": 39.60,  "lon": -9.07},
        {"name": "Biarritz",      "country": "France",      "emoji": "🏄", "lat": 43.48,  "lon": -1.56},
        {"name": "Bondi Beach",   "country": "Australia",   "emoji": "🏄", "lat": -33.89, "lon": 151.27},
        {"name": "Uluwatu",       "country": "Indonesia",   "emoji": "🌊", "lat": -8.82,  "lon": 115.08},
    ],
    "hiking": [
        {"name": "Retezat",       "country": "Romania",     "emoji": "🥾", "lat": 45.32,  "lon": 22.89},
        {"name": "Bucegi",        "country": "Romania",     "emoji": "⛰️", "lat": 45.40,  "lon": 25.45},
        {"name": "Dolomites",     "country": "Italy",       "emoji": "⛰️", "lat": 46.41,  "lon": 11.84},
        {"name": "Patagonia",     "country": "Argentina",   "emoji": "🥾", "lat": -50.94, "lon": -73.00},
        {"name": "Kilimanjaro",   "country": "Tanzania",    "emoji": "🗻", "lat": -3.07,  "lon": 37.35},
    ],
    "diving": [
        {"name": "Red Sea",       "country": "Egypt",       "emoji": "🤿", "lat": 27.21,  "lon": 33.83},
        {"name": "Great Barrier Reef","country": "Australia","emoji": "🤿", "lat": -18.29, "lon": 147.70},
        {"name": "Maldives",      "country": "Maldives",    "emoji": "🐠", "lat": 3.20,   "lon": 73.22},
        {"name": "Palau",         "country": "Palau",       "emoji": "🐠", "lat": 7.51,   "lon": 134.58},
    ],
    "camping": [
        {"name": "Apuseni",       "country": "Romania",     "emoji": "🏕️", "lat": 46.50,  "lon": 22.80},
        {"name": "Yosemite",      "country": "USA",         "emoji": "🏕️", "lat": 37.86,  "lon": -119.54},
        {"name": "Banff",         "country": "Canada",      "emoji": "🏕️", "lat": 51.17,  "lon": -115.57},
        {"name": "Lapland",       "country": "Finland",     "emoji": "🌌", "lat": 68.92,  "lon": 27.02},
    ],
    "snowboarding": [
        {"name": "Verbier",       "country": "Switzerland", "emoji": "🏂", "lat": 46.09,  "lon": 7.22},
        {"name": "Niseko",        "country": "Japan",       "emoji": "🏂", "lat": 42.80,  "lon": 140.68},
        {"name": "Bansko",        "country": "Bulgaria",    "emoji": "🏂", "lat": 41.83,  "lon": 23.49},
    ],
    "kayaking": [
        {"name": "Delta Dunarii", "country": "Romania",     "emoji": "🚣", "lat": 45.10,  "lon": 29.63},
        {"name": "Ha Long Bay",   "country": "Vietnam",     "emoji": "🚣", "lat": 20.91,  "lon": 107.18},
        {"name": "Norwegian Fjords","country": "Norway",    "emoji": "🚣", "lat": 60.47,  "lon": 6.32},
    ]
}

def get_weather(lat, lon):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,snowfall"
        response = requests.get(url, timeout=3) # Shorter timeout for responsiveness
        response.raise_for_status() 
        data = response.json()
        
        current = data.get("current", {})
        return {
            "temperature": current.get("temperature_2m", 20),
            "humidity":    current.get("relative_humidity_2m", 50),
            "pressure":    current.get("surface_pressure", 1013),
            "wind":        current.get("wind_speed_10m", 0),
            "snow":        current.get("snowfall", 0)
        }
    except Exception as e:
        print(f"⚠️ Weather API Error: {e}")
        return None

def score_destination(activity, weather):
    if not weather:
        return 0
    temp     = weather["temperature"]
    pressure = weather["pressure"]
    humidity = weather["humidity"]
    wind     = weather["wind"]
    snow     = weather.get("snow", 0)
    score    = 0

    if activity == "ski":
        if temp < 0:        score += 40
        if temp < -5:       score += 20
        if snow > 0:        score += 30
        if pressure > 1015: score += 10

    elif activity == "beach":
        if temp > 25:       score += 40
        if temp > 30:       score += 20
        if humidity < 70:   score += 20
        if wind < 20:       score += 20

    elif activity == "surfing":
        if wind > 15:       score += 40
        if wind > 25:       score += 20
        if temp > 18:       score += 20
        if pressure > 1010: score += 20

    elif activity == "hiking":
        if 10 < temp < 25:  score += 40
        if pressure > 1010: score += 30
        if humidity < 70:   score += 30

    elif activity == "diving":
        if temp > 22:       score += 40
        if wind < 15:       score += 30
        if humidity < 80:   score += 30

    elif activity == "camping":
        if 15 < temp < 28:  score += 40
        if wind < 20:       score += 30
        if humidity < 65:   score += 30

    elif activity == "snowboarding":
        if temp < 0:        score += 40
        if snow > 0:        score += 40
        if pressure > 1010: score += 20

    elif activity == "kayaking":
        if 15 < temp < 28:  score += 30
        if wind < 25:       score += 40
        if pressure > 1010: score += 30

    return score

def recommend(user_preferences):
    results = []
   
    with requests.Session() as session:
        for priority, activity in enumerate(user_preferences):
            destinations = DESTINATIONS.get(activity, [])
            scored = []
            
            for dest in destinations:
                weather = get_weather(dest["lat"], dest["lon"])
                
                score = score_destination(activity, weather) if weather else 10 
                
                scored.append({
                    **dest, # Spreads name, country, emoji
                    "score": score,
                    "weather": weather
                })
            
            
            scored.sort(key=lambda x: x["score"], reverse=True)
            
            results.append({
                "activity": activity,
                "priority": priority + 1,
                "recommendation": scored[0] if scored else None
            })
    return results