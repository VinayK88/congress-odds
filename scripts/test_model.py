import importlib.util,unittest
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('model',Path(__file__).with_name('train-model.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ModelTests(unittest.TestCase):
    def test_backtest_is_independent_of_future_prices(self):
        rows=[{'t':1700000000+i*86400,'p':.5+.05*np.sin(i/8)} for i in range(160)]
        a=m.fit(rows,'house','democratic','TEST')
        altered=[dict(r) for r in rows]
        for r in altered[-10:]: r['p']=.9
        b=m.fit(altered,'house','democratic','TEST')
        self.assertEqual(a['selectedModel'],b['selectedModel'])
        for key in a['benchmarks']:
            self.assertEqual(a['benchmarks'][key]['validationMaePP'],b['benchmarks'][key]['validationMaePP'])
            self.assertEqual(a['benchmarks'][key]['backtest'][:-10],b['benchmarks'][key]['backtest'][:-10])
        self.assertLess(a['selectionEnd'],a['testStart'])
        self.assertEqual(a['testDays'],60)
        self.assertTrue(0<=a['forecast']<=1)
    def test_missing_candles_are_not_bridged(self):
        rows=[{'t':1700000000+i*86400,'p':.5} for i in range(170)]
        rows.pop(40)
        a=m.fit(rows,'senate','republican','TEST')
        self.assertLess(a['trainingExamples'],len(rows)-8)
        self.assertEqual(a['maePP'],0)
        self.assertEqual(a['baselineMaePP'],0)
    def test_future_and_null_quotes_excluded(self):
        candle=lambda t,b,a:{'end_period_ts':t,'yes_bid':{'close_dollars':b},'yes_ask':{'close_dollars':a}}
        rows=m.extract({'candlesticks':[candle(100,'.4','.6'),candle(101,None,'.6'),candle(200,'.4','.6')]},150)
        self.assertEqual(rows,[{'t':100,'p':.5}])
if __name__=='__main__': unittest.main()
