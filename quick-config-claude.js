// 在浏览器开发者工具的 Console 中运行这段代码来快速配置 Claude
// 按 F12 打开开发者工具，切换到 Console 标签，粘贴并回车

const config = {
  baseUrl: 'https://ccxx.com',  // 修改为你的中转站地址
  authToken: 'sk-',              // 修改为你的完整 API 密钥
  models: [
    {
      id: 'claude-sonnet-4-6',
      name: 'Sonnet 4.6 (Daily Mode)',
      description: 'Fast / Save Token',
      effort: 'low',
      color: 'green'
    },
    {
      id: 'claude-opus-4-6',
      name: 'Opus 4.6 (Expert)',
      description: 'Deep Reasoning',
      effort: 'high',
      color: 'gold'
    },
    {
      id: 'claude-opus-4-7',
      name: 'Opus 4.7 (Advanced)',
      description: 'Advanced Coding',
      effort: 'high',
      color: 'purple'
    },
    {
      id: 'claude-opus-4-8',
      name: 'Opus 4.8 (Ultimate)',
      description: 'Max Autonomous Agent',
      effort: 'high',
      color: 'red'
    }
  ]
};

localStorage.setItem('wam_claude_config', JSON.stringify(config));
console.log('✓ Claude 配置已保存！');
console.log('配置内容:', config);
