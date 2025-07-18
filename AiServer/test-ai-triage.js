const axios = require('axios');

// 测试AI分诊接口
async function testAiTriage() {
  try {
    const testData = {
      data: {
        sex: '男',
        age: '45',
        temperature: '38.5',
        hb: '95',
        bdH: '140',
        bdL: '90',
        o2: '95',
        complaint: '胸痛，呼吸困难，持续2小时'
      },
      flag: 0,
      skip_check: 0
    };

    console.log('发送测试数据:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:3009/api/v1/chat/ai-triage', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 验证概率值格式
    if (response.data.code === 1) {
      const data = response.data.data;
      console.log('\n=== 概率值验证 ===');
      console.log('分级概率:');
      console.log(`  危急I: ${data.危急I} (${typeof data.危急I})`);
      console.log(`  危急II: ${data.危急II} (${typeof data.危急II})`);
      console.log(`  非危急: ${data.非危急} (${typeof data.非危急})`);
      
      const totalLevel = parseFloat(data.危急I) + parseFloat(data.危急II) + parseFloat(data.非危急);
      console.log(`  总和: ${totalLevel.toFixed(1)}`);
      
      if (data.科室) {
        console.log('\n科室概率:');
        Object.entries(data.科室).forEach(([dept, prob]) => {
          console.log(`  ${dept}: ${prob} (${typeof prob})`);
        });
        
        const totalDept = Object.values(data.科室).reduce((sum, val) => sum + parseFloat(val), 0);
        console.log(`  总和: ${totalDept.toFixed(1)}`);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testAiTriage(); 