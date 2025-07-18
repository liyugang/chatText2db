// 测试概率值处理逻辑
function testProbabilityLogic() {
  console.log('=== 测试概率值处理逻辑 ===\n');
  
  // 模拟AI响应
  const mockAiResponse = {
    危急I: 0.3333,
    危急II: 0.3333,
    非危急: 0.3334,
    科室: {
      "心内科": 0.3333,
      "急诊科": 0.3333,
      "呼吸内科": 0.3334
    },
    msg: "测试分诊建议"
  };
  
  console.log('原始AI响应:', JSON.stringify(mockAiResponse, null, 2));
  
  // 模拟处理逻辑
  const addRandomVariation = (value, maxVariation = 0.2) => {
    const baseValue = parseFloat(value);
    const variation = (Math.random() - 0.5) * maxVariation;
    return Math.max(0, Math.min(1, baseValue + variation));
  };
  
  // 处理分级概率
  let 危急I = addRandomVariation(mockAiResponse.危急I, 0.15);
  let 危急II = addRandomVariation(mockAiResponse.危急II, 0.15);
  let 非危急 = addRandomVariation(mockAiResponse.非危急, 0.15);
  
  console.log('\n添加随机偏差后:');
  console.log(`危急I: ${危急I.toFixed(3)}`);
  console.log(`危急II: ${危急II.toFixed(3)}`);
  console.log(`非危急: ${非危急.toFixed(3)}`);
  
  // 重新归一化
  const totalLevel = 危急I + 危急II + 非危急;
  危急I = (危急I / totalLevel).toFixed(1);
  危急II = (危急II / totalLevel).toFixed(1);
  非危急 = (非危急 / totalLevel).toFixed(1);
  
  console.log('\n归一化后（保留1位小数）:');
  console.log(`危急I: ${危急I}`);
  console.log(`危急II: ${危急II}`);
  console.log(`非危急: ${非危急}`);
  console.log(`总和: ${(parseFloat(危急I) + parseFloat(危急II) + parseFloat(非危急)).toFixed(1)}`);
  
  // 处理科室概率
  const normalizedDept = {};
  Object.keys(mockAiResponse.科室).forEach(key => {
    const originalValue = parseFloat(mockAiResponse.科室[key]);
    const variedValue = addRandomVariation(originalValue, 0.2);
    normalizedDept[key] = variedValue;
  });
  
  console.log('\n科室概率添加随机偏差后:');
  Object.entries(normalizedDept).forEach(([dept, prob]) => {
    console.log(`${dept}: ${prob.toFixed(3)}`);
  });
  
  // 重新归一化科室概率
  const totalDept = Object.values(normalizedDept).reduce((sum, val) => sum + val, 0);
  Object.keys(normalizedDept).forEach(key => {
    normalizedDept[key] = (normalizedDept[key] / totalDept).toFixed(1);
  });
  
  console.log('\n科室概率归一化后（保留1位小数）:');
  Object.entries(normalizedDept).forEach(([dept, prob]) => {
    console.log(`${dept}: ${prob}`);
  });
  console.log(`总和: ${Object.values(normalizedDept).reduce((sum, val) => sum + parseFloat(val), 0).toFixed(1)}`);
  
  // 最终结果
  const finalResult = {
    危急I,
    危急II,
    非危急,
    科室: normalizedDept,
    msg: mockAiResponse.msg
  };
  
  console.log('\n最终结果:');
  console.log(JSON.stringify(finalResult, null, 2));
}

// 运行测试
testProbabilityLogic(); 