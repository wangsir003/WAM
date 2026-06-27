import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import App from './App.vue';

// 导入 Ant Design Vue 样式
import 'ant-design-vue/dist/reset.css';

console.log('Starting WAM application...');
console.log('Vue:', createApp);
console.log('Pinia:', createPinia);
console.log('Antd:', Antd);
console.log('App:', App);

try {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(Antd);

  console.log('Mounting app to #app...');
  app.mount('#app');
  console.log('✓ App mounted successfully!');
} catch (error) {
  console.error('Failed to mount app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: Arial;">
      <h2>启动失败</h2>
      <p><strong>错误：</strong> ${error.message}</p>
      <pre>${error.stack}</pre>
    </div>
  `;
}
