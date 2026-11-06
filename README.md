# SolarFlow

## Run it
No install needed. Unzip, then either:
- double-click `index.html`, or
- from this folder run `python3 -m http.server 8080` and open http://localhost:8080

## Try this demo path (use the "Signed in as" selector, top right)
1. **Customer** → a four-step flow: *Your home* → *Template* (Essential / Recommended / Premium) → *Fine-tune* → *Review*. In Fine-tune, click empty roof slots or battery slots (or use + / −), drag through the day to see solar, battery and grid, and watch the bill panel on the right move. Then send it to the engineer, as is or customized.
2. **Site engineer** → Project pipeline → open the new project → approve. Then **Intake/permit staff** approves (stage 1).
3. **Engineer** then **Manager** approve the quotation (stage 2). **Staff** release it (stage 3).
4. **Customer** → My project → accept quotation → upload requirements (simulated OCR).
5. **Staff** → submit permit package. **Manager** → assign a technician. **Technician** ticks milestones. **QA** turns over.
6. **Customer** → My bill insights (demo accounts P-1004 and P-1008) and **Manager / Management** → Analytics, Analytics spec.

## Files
- `model.js` sizing and energy-balance math (assumptions at the top)
- `data.js` seed projects and SIMULATED analytics data
- `app.js` screens, roles, approval gates
- Data persists in your browser (localStorage). "Start over" clears it.

## Honest limits
All analytics data is simulated; rates, prices and permit requirements are placeholders to validate with the client.
