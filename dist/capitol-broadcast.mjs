// Client-side calendar countdown. No election data, predictions or external API.
const days = document.getElementById('election-days');
const label = document.getElementById('election-days-label');
function updateElectionCalendar(){
  if (!days || !label) return;
  const today = new Date();
  const calendarDay = Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
  const electionDay = Date.UTC(2026,10,3);
  const remaining = Math.round((electionDay-calendarDay)/86400000);
  if (remaining > 0) {
    days.textContent = String(remaining);
    label.textContent = remaining === 1 ? 'Day to election' : 'Days to election';
    days.classList.remove('is-held');
  } else if (remaining === 0) {
    days.textContent = 'TODAY';
    label.textContent = 'Election day · Nov 3';
    days.classList.add('is-held');
  } else {
    days.textContent = 'NOV 03';
    label.textContent = 'Election day · 2026';
    days.classList.add('is-held');
  }
}
updateElectionCalendar();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateElectionCalendar();
});
