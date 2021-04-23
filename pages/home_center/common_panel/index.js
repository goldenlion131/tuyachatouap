// miniprogram/pages/home_center/common_panel/index.js.js
import { getDevFunctions, getDeviceDetails, deviceControl } from '../../../utils/api/device-api'
import wxMqtt from '../../../utils/mqtt/wxMqtt'
import * as echarts from '../../../ec-canvas/echarts';


const app = getApp();

function setOption(chart) {
  const option = {
    color: ['#37a2da', '#32c5e9', '#67e0e3'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {            // 坐标轴指示器，坐标轴触发有效
        type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
      }
    },
    legend: {
      data: ['热度', '正面', '负面']
    },
    grid: {
      left: 20,
      right: 20,
      bottom: 15,
      top: 40,
      containLabel: true
    },
    xAxis: [
      {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666'
        }
      }
    ],
    yAxis: [
      {
        type: 'category',
        axisTick: { show: false },
        data: ['周日','周六', '周五','周四','周三','周二','周一'],
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666'
        }
      }
    ],
    series: [
      {
        name: '正常电量',
        type: 'bar',
        label: {
          normal: {
            show: true,
            position: 'inside'
          }
        },
        data: [300, 270, 340, 344, 300, 320, 310],
        itemStyle: {
          // emphasis: {
          //   color: '#37a2da'
          // }
        }
      },
      {
        name: '实际电量',
        type: 'bar',
        stack: '总量',
        label: {
          normal: {
            show: true
          }
        },
        data: [120, 102, 141, 174, 190, 250, 220],
        itemStyle: {
          // emphasis: {
          //   color: '#32c5e9'
          // }
        }
      },
      {
        name: '节约电量',
        type: 'bar',
        stack: '总量',
        label: {
          normal: {
            show: true,
            position: 'left'
          }
        },
        data: [-20, -32, -21, -34, -90, -130, -110],
        itemStyle: {
          // emphasis: {
          //   color: '#67e0e3'
          // }
        }
      }
    ]
  };
  chart.setOption(option);
}


Page({
  onShareAppMessage: function (res) {
    return {
      title: 'ECharts 可以在微信小程序中使用啦！',
      path: '/pages/index/index',
      success: function () { },
      fail: function () { }
    }
  },
  /**
   * 页面的初始数据
   */
  data: {
    ec: {
      // 将 lazyLoad 设为 true 后，需要手动初始化图表
      lazyLoad: true
    },
    isChartIn:true,
    isChartInit:false,
    isLoaded: false,
    isDisposed: false,
    device_name: '',
    titleItem: {
      name: '',
      value: '',
    },
    roDpList: {}, //只上报功能点
    rwDpList: {}, //可上报可下发功能点
    isRoDpListShow: false,
    isRwDpListShow: false,
    forest: '../../../image/forest@2x.png',
    isCountdown:'false', //不显示倒计时
    commonPanel:'common-panel-backgroud-close',//面板颜色
    switchCode:"",
    switchValue:false,
    switchStatus:"关闭",
    isWarring:false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const { device_id } = options
    this.setData({ device_id })

    // mqtt消息监听
    wxMqtt.on('message', (topic, newVal) => {
      const { status } = newVal
      console.log(newVal)
      this.updateStatus(status)
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: async function () {

    // 获取组件
    this.ecComponent = this.selectComponent('#mychart-dom-bar');

    const { device_id } = this.data
    const [{ name, status, icon }, { functions = [] }] = await Promise.all([
      getDeviceDetails(device_id),
      getDevFunctions(device_id),
    ]);

    const { roDpList, rwDpList } = this.reducerDpList(status, functions)

    // 获取头部展示功能点信息
    let titleItem = {
      name: '',
      value: '',
    };
    if (Object.keys(roDpList).length > 0) {
      let keys = Object.keys(roDpList)[0];
      titleItem = roDpList[keys];


    } else {
      let keys = Object.keys(rwDpList)[0];
      titleItem = rwDpList[keys];

    }
    if(titleItem.value==false)
    {
      this.data.switchStatus="关闭"
    }
    else{
      this.data.switchStatus="打开"
    }


    const roDpListLength = Object.keys(roDpList).length
    const isRoDpListShow = Object.keys(roDpList).length > 0
    const isRwDpListShow = Object.keys(rwDpList).length > 0

    this.setData({ titleItem, roDpList, rwDpList, device_name: name, isRoDpListShow, isRwDpListShow, roDpListLength, icon, })
  },

  // 分离只上报功能点，可上报可下发功能点
  reducerDpList: function (status, functions) {
    // 处理功能点和状态的数据
    let roDpList = {};
    let rwDpList = {};
    if (status && status.length) {
      status.map((item) => {
        const { code, value } = item;
        let isExit = functions.find(element => element.code == code);
        if (isExit) {
          let rightvalue = value
          // 兼容初始拿到的布尔类型的值为字符串类型
          if (isExit.type === 'Boolean') {
            rightvalue = value == 'true';
            console.log("!!!!"+code);
            console.log("!!!!"+rightvalue);
            this.setData({
              switchCode:code,
              switchValue:rightvalue
              });
           
          }
 
          rwDpList[code] = {
            code,
            value: rightvalue,
            type: isExit.type,
            values: isExit.values,
            name: isExit.name,
          };
        } else {
          roDpList[code] = {
            code,
            value,
            name: code,
          };
        }
      });
    }
    return { roDpList, rwDpList }
  },

  switch:function(e){
    var that= this;
    that.cleanAll();
    if(that.data.commonPanel=='common-panel-backgroud-close'){
      that.setData({
        commonPanel:'common-panel-backgroud-open',
        switchStatus:"开启"
      })
    }
    else
    {
      that.setData({
        commonPanel:'common-panel-backgroud-close',
        switchStatus:"关闭"
      })
    }

    that.sendDpEnum(e,that.data.switchCode,that.data.switchValue);
  },
  epc:function(event){
    var that= this;    
    if(that.data.isChartIn==true)
    {
      that.setData({
        isChartIn:false
      });
      if(that.data.isChartInit==false)
      {
        
       that.init();
       that.setData({
        isChartInit:true
      });
      }

    }
  },
  cleanAll:function(){
    var that= this
    that.setData({
      isCountdown:true,
    })
      that.setData({
        isChartIn:true
      });
      that.setData({
        isWarring:true
      })
  },
  switchTimer:function(event){
    var that= this;
    that.cleanAll();
    if(that.data.isCountdown==true){
      that.setData({
        isCountdown:false
      })
    }
  },
  log:function(){
    var that= this;
    that.cleanAll();
    if(that.data.isWarring==true)
    {
      that.setData({
        isWarring:false
      })

    }
  },
  sendDpEnum: async function (e,dpCode,value) {
    const { device_id } = this.data
    console.log(device_id+"!!!"+dpCode+"!!!"+value);
    const { success } = await deviceControl(device_id, dpCode, value)
  },
  sendDp: async function (e) {
    const { dpCode, value } = e.detail
    const { device_id } = this.data
    console.log(device_id+"!!!"+dpCode+"!!!"+value);
    const { success } = await deviceControl(device_id, dpCode, value)
  },
  dpCode:0,
  value:0,
  updateStatus: function (newStatus) {
    let { roDpList, rwDpList, titleItem } = this.data

    newStatus.forEach(item => {
      const { code, value } = item

      if (typeof roDpList[code] !== 'undefined') {
        roDpList[code]['value'] = value;
      } else if (rwDpList[code]) {
        rwDpList[code]['value'] = value;
      }
    })

    // 更新titleItem
    if (Object.keys(roDpList).length > 0) {
      let keys = Object.keys(roDpList)[0];
      titleItem = roDpList[keys];
    } else {
      let keys = Object.keys(rwDpList)[0];
      titleItem = rwDpList[keys];
    }
 
    this.setData({ titleItem, roDpList: { ...roDpList }, rwDpList: { ...rwDpList } })
  },


    dispose: function () {
      if (this.chart) {
        this.chart.dispose();
      }

      this.setData({
        isDisposed: true
      });
    }
  ,

  // 点击按钮后初始化图表
  init: function() {
    this.ecComponent.init((canvas, width, height, dpr) => {
      // 获取组件的 canvas、width、height 后的回调函数
      // 在这里初始化图表
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr // new
      });
      setOption(chart);

      // 将图表实例绑定到 this 上，可以在其他成员函数（如 dispose）中访问
      this.chart = chart;

      this.setData({
        isLoaded: true,
        isDisposed: false
      });

      // 注意这里一定要返回 chart 实例，否则会影响事件处理等
      return chart;
    });
  },


  jumpTodeviceEditPage: function(){
    console.log('jumpTodeviceEditPage')
    const { icon, device_id, device_name } = this.data
    wx.navigateTo({
      url: `/pages/home_center/device_manage/index?device_id=${device_id}&device_name=${device_name}&device_icon=${icon}`,
    })
  }
})

