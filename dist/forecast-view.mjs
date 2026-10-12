// Presentation helpers shared by the ML dashboard and README.
// Models forecast next-day market prices, never election outcomes.
export function forecastExpired(forecastFor, now=Date.now()) {
 const target=Date.parse(forecastFor);
 return !Number.isFinite(target) || target<=now;
}
export function inspectedForecast(model, requested='selected', now=Date.now()) {
 if(!model?.benchmarks || !model.selectedModel) return null;
 const selected=model.selectedModel;
 const inspected=requested==='selected'||!Object.hasOwn(model.benchmarks,requested)?selected:requested;
 const benchmark=model.benchmarks[inspected];
 if(!benchmark || !Number.isFinite(benchmark.forecast))return null;
 return {
   inspectedModel:inspected,
   selectedModel:selected,
   inspectedForecast:benchmark.forecast,
   selectedForecast:model.forecast,
   isSelection:inspected===selected,
   expired:forecastExpired(model.forecastFor,now)
 };
}
