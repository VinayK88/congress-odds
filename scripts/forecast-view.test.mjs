import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastExpired,inspectedForecast} from '../dist/forecast-view.mjs';
const model={
 selectedModel:'baseline',
 forecast:.62,
 forecastFor:'2026-10-13T04:00:00Z',
 benchmarks:{baseline:{forecast:.62},ridge:{forecast:.73},forest:{forecast:.59}}
};
const now=Date.parse('2026-10-12T12:00:00Z');
test('selected inspection matches the published forecast',()=>{
 const view=inspectedForecast(model,'selected',now);
 assert.equal(view.inspectedModel,'baseline');
 assert.equal(view.inspectedForecast,.62);
 assert.equal(view.isSelection,true);
 assert.equal(view.expired,false);
});
test('inspecting another model never mislabels its forecast as the published choice',()=>{
 const view=inspectedForecast(model,'ridge',now);
 assert.equal(view.inspectedForecast,.73);
 assert.equal(view.selectedForecast,.62);
 assert.equal(view.isSelection,false);
 assert.equal(view.selectedModel,'baseline');
});
test('expiry honors the target time, and unknown choices are safe',()=>{
 assert.equal(forecastExpired(model.forecastFor,Date.parse(model.forecastFor)),true);
 assert.equal(forecastExpired(model.forecastFor,now),false);
 assert.equal(forecastExpired('not-a-date',now),true);
 assert.equal(inspectedForecast(model,'unknown',now).inspectedForecast,.62);
});
