/**
 * ADB 工具设置脚本
 * 用于在新电脑上解压和设置 ADB 工具
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADB_ZIP_PATH = join(__dirname, '..', '..', '0文档', '0安装包', 'windows上抓日志工具', 'platform-tools-latest-windows.zip');
const RESOURCES_DIR = join(__dirname, 'resources');
const ADB_TARGET_DIR = join(RESOURCES_DIR, 'platform-tools');

async function setupAdb() {
  console.log('========================================');
  console.log('WAM ADB 工具设置向导');
  console.log('========================================\n');

  // 检查是否已经存在 ADB 工具
  if (existsSync(join(ADB_TARGET_DIR, 'adb.exe'))) {
    console.log('✓ ADB 工具已存在，无需重新设置');
    console.log('  路径:', ADB_TARGET_DIR);
    return;
  }

  // 检查 ZIP 文件是否存在
  if (!existsSync(ADB_ZIP_PATH)) {
    console.error('✗ 未找到 ADB 工具压缩包');
    console.error('  期望路径:', ADB_ZIP_PATH);
    console.error('\n请确保压缩包存在，或手动解压 platform-tools 到:');
    console.error('  ' + RESOURCES_DIR);
    process.exit(1);
  }

  console.log('正在解压 ADB 工具...');
  console.log('  源文件:', ADB_ZIP_PATH);
  console.log('  目标目录:', RESOURCES_DIR);

  try {
    // 使用 PowerShell 解压
    const psCommand = `Expand-Archive -Path "${ADB_ZIP_PATH}" -DestinationPath "${RESOURCES_DIR}" -Force`;
    await execAsync(`powershell -Command "${psCommand}"`);

    console.log('\n✓ ADB 工具解压成功！');
    console.log('  ADB 路径:', join(ADB_TARGET_DIR, 'adb.exe'));
    console.log('\n提示: 应用运行时会自动将 ADB 添加到 PATH 环境变量');
    console.log('      无需手动配置系统环境变量\n');
  } catch (error) {
    console.error('\n✗ 解压失败:', error.message);
    console.error('\n请手动解压以下文件:');
    console.error('  源:', ADB_ZIP_PATH);
    console.error('  到:', RESOURCES_DIR);
    process.exit(1);
  }
}

setupAdb().catch(error => {
  console.error('发生错误:', error);
  process.exit(1);
});
