// Time-based refresh policy for the 2026 U.S. congressional election.
// Phase boundaries use Eastern Time, the election's local calendar, to avoid
// changing cadence at an arbitrary UTC or visitor-local midnight.
const ZONE='America/New_York';
const easternDateFormatter=new Intl.DateTimeFormat('en-CA',{
 timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'
});
export function electionDateET(now=new Date()) {
 const parts=Object.fromEntries(easternDateFormatter.formatToParts(now).map(p=>[p.type,p.value]));
 return [parts.year,parts.month,parts.day].join('-');
}
export function refreshCadence(now=new Date()) {
 const date=electionDateET(now);
 if(date<'2026-10-20') return {phase:'Regular coverage',publishMinutes:60,profilesMinutes:60,browserMinutes:5,browserProfilesMinutes:5};
 if(date<'2026-10-27') return {phase:'Two-week countdown',publishMinutes:30,profilesMinutes:30,browserMinutes:3,browserProfilesMinutes:5};
 if(date<'2026-11-01') return {phase:'Final week',publishMinutes:15,profilesMinutes:30,browserMinutes:2,browserProfilesMinutes:3};
 if(date<='2026-11-03') return {phase:'Election countdown',publishMinutes:5,profilesMinutes:15,browserMinutes:1,browserProfilesMinutes:2};
 if(date<='2026-11-10') return {phase:'Post-election verification',publishMinutes:60,profilesMinutes:60,browserMinutes:5,browserProfilesMinutes:5};
 return {phase:'Post-election archive',publishMinutes:360,profilesMinutes:360,browserMinutes:10,browserProfilesMinutes:10};
}
// Scheduled runs are requested at :02,:07,...:57 UTC (not top-of-hour,
// where GitHub scheduled workflows commonly experience contention).
// Github Actions is best-effort: queued runs may be delayed or skipped.
export function scheduledSlotDue(minutes,now=new Date()) {
 if(!Number.isInteger(minutes)||minutes<5||minutes%5)throw Error('Cadence must be a multiple of 5 minutes');
 const utcMinutes=now.getUTCHours()*60+now.getUTCMinutes();
 const slot=Math.floor(((utcMinutes-2+1440)%1440)/5);
 return slot%(minutes/5)===0;
}
// Compare actual published snapshot times, not the runner's current clock minute.
// GitHub Actions scheduled jobs may start late, even beyond their nominal slot.
export function snapshotDue(timestamp, minutes, now=new Date()) {
 if(!Number.isFinite(minutes)||minutes<=0)throw Error('Refresh interval must be positive');
 const last=Date.parse(timestamp);
 if(!Number.isFinite(last))return true;
 const grace=Math.min(60000,minutes*6000);
 return now.getTime()-last>=minutes*60000-grace;
}
export function formatMinutes(minutes) {
 if(minutes===60)return 'hourly';
 if(minutes%60===0)return `every ${minutes/60} hours`;
 return `every ${minutes} minutes`;
}
