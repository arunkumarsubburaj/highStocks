import { AfterViewInit, Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as data from './../assets/data.json';
declare var Highcharts: any;
var tickIntervalCnt;
var isoElectricBaseline = 0; // set to zero (0), the "isoelectric baseline"
var autoGainVal;
var triggerMarker;
var chartData: any = (data as any).default;

// for capturing load times
var r0, r1, t0, t1, z0, z1;

var range = 5;
var maxRange = 7;
var minRange = 0;

var contextPath;
var gainText;
var tooltipLabel;
var labelGainUnits;
var epsZoomTimeLabel;
var triggerLabel;
var bigBoxes = 6;
var gainLabel = ['5.0', '15.0', '25.0', '50.0', '100', '200'];
var gains = [];
var gainIndex = 0;
var autoGainIndex = 3;
var tickIntervalValue = (gains[gainIndex] * 2) / bigBoxes;
var minorTickIntervalValue = tickIntervalValue / 5;

var caliperColor = '#00B200';

//console.log("gain index (default) defined as :" + gainIndex);
//console.log("tick interval (default) defined as :" + tickIntervalValue);
//console.log("minor tick interval (default) defined as :" + minorTickIntervalValue);

var showingCalipers = false;
var caliperValue = 1000;
if (autoGainVal == null) {
  autoGainVal = 250;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  constructor(private http: HttpClient) {}
  ngAfterViewInit() {
    for (var i = 0; i < gainLabel.length; i++) {
      gains.push(this.calculateGainValue(parseFloat(gainLabel[i])));
    }
    var lastVal = chartData[chartData.length - 1];
    tickIntervalCnt = this.defineTickCount(lastVal[0]);

    this.defineGainIndex();
    this.createChart();
  }
  createChart() {
    let proxy = this;
    var mainChart = Highcharts.chart('container', {
      chart: {
        type: 'line',
        resetZoomButton: {
          theme: {
            display: 'none',
          },
        },
        height: 360,
        width: 1250,
        marginTop: 40,
        events: {},
        zoomAmount: 1.5,
        zoomCount: 0,
      },
      title: {
        text: '',
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
        crosshairs: true,
      },
      legend: {
        enabled: true,
        itemStyle: {
          fontSize: '12px',
          fontWeight: 'normal',
        },
        symbolHeight: 0.001,
        symbolWidth: 0.001,
        symbolRadius: 0.001,
      },
      xAxis: {
        visible: true,
        min: 0,
        max: maxRange,
        crosshair: true,
        minorTicks: true,
        minorTickWidth: 1,
        minorTickLength: 6,
        minorGridLineWidth: 1.5,
        gridLineColor: '#D9D9D9',
        tickColor: '#808080',
        minorGridLineColor: '#F3F3F3',
        tickInterval: 0.2,
        minorTickInterval: 0.04,
        gridLineWidth: 1,
        labels: {
          formatter: function () {
            if (proxy.isInt(this.value)) {
              if (this.value < 60) {
                return this.value + ' s';
              } else {
                var min = Math.floor(this.value / 60);
                var sec: number | string = this.value % 60;
                if (sec < 10) {
                  sec = '0' + sec;
                }
                return min + ':' + sec;
              }
            }
          },
          y: 25,
          autoRotation: [0],
          style: {
            textOverflow: 'none',
            whiteSpace: 'nowrap',
          },
        },
        events: {
          // setExtremes: syncExtremes,
          // afterSetExtremes: afterExtremes,
        },
        minPadding: 0,
        maxPadding: 0,
      },
      yAxis: {
        title: {
          text: '',
        },
        labels: {
          enabled: false,
        },
        startOnTick: true,
        gridLineColor: '#D9D9d9',
        minorTicks: true,
        minorGridLineColor: '#F3F3F3',
        gridLineWidth: 1,
        scrollbar: {
          enabled: true,
          showFull: false,
        },
      },
      navigator: {
        enabled: true,
        height: 40,
        handles: {
          enabled: false,
        },
        xAxis: {
          labels: {
            enabled: true,
            formatter: function () {
              if (proxy.isInt(this.value)) {
                if (this.value < 60) {
                  return this.value + ' s';
                } else {
                  var min = Math.floor(this.value / 60);
                  var sec: string | number = this.value % 60;
                  if (sec < 10) {
                    sec = '0' + sec;
                  }
                  return min + ':' + sec;
                }
              }
            },
            autoRotation: [0],
            style: {
              textOverflow: 'none',
              whiteSpace: 'nowrap',
              fontSize: '.8em',
              color: '#666',
            },
          },
          ticks: true,
          units: [['millisecond', [tickIntervalCnt]]],
        },
      },
      scrollbar: {
        enabled: false,
        height: 20,
      },
      plotOptions: {
        series: {
          // attempting to set line width on all series to 0.5 ~ not working with boost mode
          lineWidth: 0.5,
          // disable display of series graph in navigator - set to false
          showInNavigator: true,
          // display instead ticks indicating time in navigator (see navigator.xAxis)
          navigatorOptions: {
            color: '#FFF',
            lineWidth: 0,
            opacity: 0,
            fillOpacity: 0,
          },
          gapSize: 2,
          states: {
            hover: {
              enabled: false,
            },
            inactive: {
              opacity: 1,
            },
          },
          marker: {
            enabled: false,
          },
          getExtremesFromAll: true,
          boostThreshold: 1000,
          events: {
            legendItemClick: function () {
              return false;
            },
          },
        },
      },
      series: [
        {
          name: 'Test',
          boostThreshold: 1000,
          type: 'line', // 'spline' fixes lineWidth issue, but boost module stops working
          turboThreshold: 1000,
          id: 'ekgWaveformSeries',
          data: chartData as any[],
          color: '#000',
          // attempting to series' line width to 0.5 ~ not working with boost mode
          lineWidth: 0.5,
        },
      ],
      boost: {
        enabled: true,
        // usePreallocated: true,
        allowForce: true,
        useGPUTranslations: true,
      },
      exporting: {
        buttons: {
          contextButton: {
            enabled: false,
          },
        },
      },
    });
  }
  defineGainIndex() {
    // set gain index based on 'autoGain' from payload
    gainIndex = gainLabel.indexOf(autoGainVal.toString());
    if (gainIndex == -1) {
      gainIndex = gainLabel.indexOf(autoGainVal.toFixed(1));

      if (gainIndex == -1) {
        gainIndex = 3;
      }
    }
    autoGainIndex = gainIndex;
    //console.log("gain index redefined from payload as :" + gainIndex);
    // redefine the major and minor tick intervals, based on the updated gain index
    tickIntervalValue = (gains[gainIndex] * 2) / bigBoxes;
    //console.log("tick interval redefined from payload as :" + tickIntervalValue);
    minorTickIntervalValue = tickIntervalValue / 5;
    //console.log("minor tick interval redefined from payload as :" + minorTickIntervalValue);
  }
  isInt(value) {
    return (
      !isNaN(value) && parseInt(value) == value && !isNaN(parseInt(value, 10))
    );
  }
  calculateGainValue(mmMv) {
    var bigBoxes = 6;
    var boxes = mmMv / 5;
    var value = (bigBoxes / boxes / 2) * 1000;
    return value;
  }
  defineTickCount(lastVal) {
    if (lastVal > 420) {
      return 60;
    } else if (lastVal > 120) {
      return 30;
    } else if (lastVal > 59) {
      return 10;
    } else if (lastVal > 15) {
      return 5;
    } else {
      return 1;
    }
  }
}
