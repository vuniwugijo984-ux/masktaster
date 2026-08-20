# Mask Taster 部署到 GitHub Pages：完整操作指南

这份指南适用于当前这个 Mask Taster 项目。项目已经包含 GitHub Pages 所需的静态入口、Vite 构建配置和自动部署工作流；你不需要手工上传构建后的网页文件。

## 0. 先理解两个不同的东西

- **GitHub repository（仓库）**：存放源代码和版本历史。
- **GitHub Pages**：读取仓库中的代码，由 GitHub Actions 构建后，对外提供一个任何人都能打开的网站。

把代码上传到 GitHub 不等于已经上线。仓库创建、代码推送、Pages 启用和 Actions 部署是四个连续步骤。

当前项目的普通构建是为 ChatGPT Sites/Cloudflare Worker 准备的，并不是 GitHub Pages 可以直接发布的静态目录。因此不要把 `dist/` 上传到 Pages。项目中新增的 `npm run build:pages` 才是 GitHub Pages 使用的静态构建。

## 1. 你需要准备什么

1. 一个 GitHub 账号：https://github.com/
2. Windows 电脑上安装 Git for Windows：https://git-scm.com/download/win
3. 当前项目的完整源代码文件夹。

Node.js 不是第一次上传所必需的，因为 GitHub Actions 会在云端完成构建。只有你想在自己电脑上预先测试网站时，才需要安装 Node.js。

### 关于仓库公开性

GitHub Free 可以从公开仓库免费使用 GitHub Pages。私有仓库使用 Pages 取决于你的 GitHub 套餐。最省事的方案是建立一个公开仓库，但这意味着网页源代码和放进仓库的图片都会公开。

不要把以下内容放进仓库：

- `.env` 文件；
- API key、访问令牌或密码；
- 未准备公开的字幕库、节目视频、音频或其他素材；
- 只授权你个人使用的文件。

当前网页不需要 OpenAI API、模型费用、数据库或登录系统。

## 2. 创建 GitHub 仓库

1. 登录 GitHub。
2. 点击右上角的 `+`。
3. 选择 `New repository`。
4. Repository name 填：`masktaster`。
5. Description 可填：`An unofficial wording repair game.`
6. 选择 `Public`。
7. **不要**勾选 `Add a README file`。
8. **不要**添加 `.gitignore`。
9. **不要**选择 license。License 可以以后在确认素材和代码授权方式后再加。
10. 点击 `Create repository`。

不要初始化 README 的原因是：空仓库最容易接受本地项目的第一次推送，不会产生两个互不相关的提交历史。

创建后不要关闭页面。GitHub 会显示一个类似下面的地址：

```text
https://github.com/YOUR-NAME/masktaster.git
```

把 `YOUR-NAME` 换成你的实际 GitHub 用户名。

## 3. 把项目上传到仓库

### 3.1 解压项目

把项目 ZIP 解压到一个固定位置，例如：

```text
C:\Users\你的用户名\Documents\masktaster
```

不要直接在 ZIP 压缩包内部操作。

检查解压后的文件夹。至少应包含：

```text
app/
public/
github-pages/
.github/workflows/deploy-pages.yml
package.json
package-lock.json
vite.pages.config.ts
```

### 3.2 打开 PowerShell

在项目文件夹空白处按住 Shift 并点击鼠标右键，选择“在此处打开 PowerShell 窗口”或“在终端中打开”。

也可以手动执行：

```powershell
cd "C:\Users\你的用户名\Documents\masktaster"
```

路径中有空格时必须保留双引号。

### 3.3 初始化 Git 并提交

逐行执行：

```powershell
git init
git add -A
git commit -m "Initial Mask Taster prototype"
git branch -M main
```

第一次使用 Git 时，如果它要求姓名和邮箱，执行：

```powershell
git config --global user.name "你的 GitHub 用户名"
git config --global user.email "你在 GitHub 使用的邮箱"
```

然后重新执行：

```powershell
git commit -m "Initial Mask Taster prototype"
```

### 3.4 连接远程仓库

把下面地址替换成你刚创建的仓库地址：

```powershell
git remote add origin https://github.com/YOUR-NAME/masktaster.git
git push -u origin main
```

GitHub 不接受账号密码作为 Git 推送密码。正常情况下，Git for Windows 自带的 Git Credential Manager 会打开浏览器，让你登录并授权。完成一次后，后续通常不需要重复登录。

如果执行 `git remote add origin` 时出现 `remote origin already exists`，先检查：

```powershell
git remote -v
```

如果地址错误，改成：

```powershell
git remote set-url origin https://github.com/YOUR-NAME/masktaster.git
git push -u origin main
```

## 4. 启用 GitHub Pages

1. 回到 GitHub 中的 `masktaster` 仓库。
2. 点击仓库顶部的 `Settings`。
3. 在左侧菜单找到 `Pages`。
4. 在 `Build and deployment` 区域找到 `Source`。
5. 选择 `GitHub Actions`。

不要选择 `Deploy from a branch`。这个项目需要先执行 Vite 静态构建，应该使用已经提供的 Actions 工作流。

官方说明：

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 5. 启动第一次部署

代码第一次推送到 `main` 时，`.github/workflows/deploy-pages.yml` 通常已经自动触发。

1. 点击仓库顶部的 `Actions`。
2. 左侧选择 `Deploy Mask Taster to GitHub Pages`。
3. 打开最新一次运行。
4. 等待 `build` 和 `deploy` 两个任务都变成绿色对勾。

如果你在推送代码之后才启用 Pages，第一次运行可能失败。此时：

1. 打开失败的工作流；
2. 点击右上角 `Re-run jobs`；
3. 选择 `Re-run all jobs`。

也可以在工作流页面点击 `Run workflow`，选择 `main`，再点击绿色的 `Run workflow`。

成功后网址通常是：

```text
https://YOUR-NAME.github.io/masktaster/
```

注意结尾的 `/masktaster/`。这是项目型 Pages 网站，不是账号主页。

## 6. 以后怎样更新网站

如果你拿到了一份新的项目 ZIP：

1. 把新 ZIP 解压到临时文件夹；
2. 找到电脑上第一次上传时使用的 `masktaster` 文件夹；
3. 把新 ZIP 内 `masktaster` 文件夹里的全部内容复制到旧文件夹，选择“替换目标中的文件”；
4. 不要删除旧文件夹里的隐藏 `.git` 文件夹。新版 ZIP 不包含它，它负责记住你的 GitHub 仓库；
5. 在旧的 `masktaster` 文件夹中打开 PowerShell。

然后执行：

```powershell
git status
git add -A
git commit -m "Update onboarding and Alex dialogue"
git push origin main
```

每次推送到 `main`，GitHub Actions 都会自动重新构建并覆盖 Pages 网站。如果 `git commit` 显示 `nothing to commit`，说明复制位置不对，或者新旧文件完全相同。

如果已经找不到第一次上传时的本地文件夹，先重新下载仓库：

```powershell
cd "$HOME\Documents"
git clone https://github.com/YOUR-NAME/masktaster.git
cd masktaster
```

再把新 ZIP 中的内容复制进这个刚克隆的文件夹，然后执行上面的 `git status`、`git add -A`、`git commit` 和 `git push origin main`。

建议提交信息描述实际变化，例如：

```powershell
git commit -m "Fix amendment placement"
git commit -m "Revise camel counterattacks"
git commit -m "Add mobile layout"
```

不要每次都写 `update`，否则以后很难找到某次修改。

## 7. 在电脑上先测试 GitHub Pages 版本（可选）

安装 Node.js 22 后，在项目目录执行：

```powershell
npm ci
npm run build:pages
```

成功后会生成：

```text
pages-dist/
```

这个目录只是本地构建结果，已经被 `.gitignore` 排除，不需要提交。

如果想启动与 GitHub Pages 相同的本地静态开发界面：

```powershell
npm run dev:pages
```

终端会显示一个本地网址，通常是 `http://localhost:5173/`。按住 `Ctrl` 点击即可打开。停止时在终端按 `Ctrl + C`。

`npm run dev` 使用的是当前项目原有的 Sites 开发环境；`npm run dev:pages` 和 `npm run build:pages` 才对应 GitHub Pages 版本。

## 8. 这个项目为什么不会在子目录里丢失 CSS 和图片

普通 GitHub Pages 项目网站位于：

```text
/masktaster/
```

不是域名根目录 `/`。如果 CSS、JavaScript 或图片仍然指向根目录，就会出现黑屏、无样式或人物图片消失。

当前项目已经做了两项处理：

1. `vite.pages.config.ts` 会从 GitHub 自动提供的 `GITHUB_REPOSITORY` 计算 `/仓库名/`；
2. Alex 和橡皮鸭图片使用相对于当前页面的路径。

构建时会自动读取仓库名，因此这里会得到 `/masktaster/`。重命名仓库后重新运行一次 Actions 即可。

## 9. 可选：使用 `YOUR-NAME.github.io` 根域名

如果仓库直接命名为：

```text
YOUR-NAME.github.io
```

网站地址会是：

```text
https://YOUR-NAME.github.io/
```

当前构建配置会自动识别这种账号主页仓库并把基础路径设成 `/`。

但一个 GitHub 账号只能有一个这样的用户主页仓库。Mask Taster 目前更适合先使用普通的 `masktaster` 项目仓库。

## 10. 可选：绑定自己的域名

### 10.1 先在 GitHub 设置

1. 打开仓库 `Settings > Pages`。
2. 在 `Custom domain` 填入域名，例如：`mask.example.com`。
3. 点击 `Save`。

### 10.2 在域名服务商设置 DNS

对于 `mask.example.com` 这种子域名，创建：

```text
Type: CNAME
Name/Host: mask
Value/Target: YOUR-NAME.github.io
```

不要把 CNAME 指向 `YOUR-NAME.github.io/masktaster`；DNS 记录不能包含 URL 路径。

### 10.3 修改构建基础路径

自定义域名从根目录提供网站，因此编辑 `.github/workflows/deploy-pages.yml`，把构建步骤改为：

```yaml
      - name: Build static GitHub Pages site
        run: npm run build:pages
        env:
          PAGES_BASE_PATH: /
```

提交并推送这次修改。否则 JavaScript 和 CSS 仍可能请求 `/masktaster/assets/...`。

### 10.4 等待并启用 HTTPS

DNS 生效和证书签发可能不是立即完成。GitHub 的域名检查通过后，在 `Settings > Pages` 勾选 `Enforce HTTPS`。

官方说明：

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

## 11. 常见错误与准确处理方式

### 11.1 网站显示 404

依次检查：

1. 仓库 `Settings > Pages > Source` 是否为 `GitHub Actions`；
2. `Actions` 页面中最新运行是否全部绿色；
3. 访问的是否是 `https://用户名.github.io/仓库名/`；
4. GitHub Free 用户的仓库是否为 Public；
5. 是否刚部署完但仍在传播，稍等一两分钟并强制刷新。

### 11.2 页面出现但没有样式，或者 Alex/鸭子消失

1. 打开浏览器开发者工具 `F12`；
2. 查看 `Console` 和 `Network`；
3. 如果资源地址少了 `/仓库名/`，确认部署的是当前版本的 `vite.pages.config.ts`；
4. 如果刚刚绑定自定义域名，确认已设置 `PAGES_BASE_PATH: /`；
5. 修改仓库名后重新运行 Actions。

### 11.3 Actions 在 `npm ci` 失败

常见原因是 `package.json` 与 `package-lock.json` 不一致，或者漏传了 lockfile。

在本地执行：

```powershell
npm install
git add package.json package-lock.json
git commit -m "Update dependency lockfile"
git push
```

### 11.4 `Get Pages site failed`、`404` 或 `Resource not accessible`

通常不是代码错误，而是 Pages 尚未启用：

1. 打开 `Settings > Pages`；
2. Source 选择 `GitHub Actions`；
3. 回到 Actions 重新运行工作流。

如果组织账号禁止 Pages 或 Actions，需要由组织管理员开放权限。

### 11.5 `Permission denied to github-actions[bot]`

确认工作流顶部仍包含：

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

再检查 `Settings > Actions > General` 中是否有组织策略禁止 Actions。

### 11.6 推送时出现认证失败

不要输入 GitHub 账号密码。更新 Git for Windows 后重新执行 `git push`，让 Git Credential Manager 打开浏览器授权。

也可以在 GitHub 使用 SSH，但对第一次部署没有必要。

### 11.7 改完后网页似乎没变化

1. 检查 `git status`，确认修改已经提交；
2. 检查 `git log -1`，确认最新提交正确；
3. 检查 Actions 是否为这次提交重新运行；
4. 使用 `Ctrl + F5` 强制刷新；
5. 在无痕窗口打开 Pages 地址，排除缓存。

## 12. 文件分工

以后最常修改的文件：

| 文件 | 用途 |
| --- | --- |
| `app/page.tsx` | 任务数据、状态机、攻击判定和主要界面 |
| `app/globals.css` | 视觉、排版、响应式布局和动画 |
| `public/` | Alex、橡皮鸭、图标等静态素材 |
| `github-pages/main.tsx` | GitHub Pages 的 React 启动入口 |
| `vite.pages.config.ts` | GitHub Pages 静态构建和仓库子路径处理 |
| `.github/workflows/deploy-pages.yml` | 每次 push 后自动部署 |
| `package.json` | 构建命令和依赖 |

不要手工编辑：

- `pages-dist/`：每次构建都会重建；
- `dist/`：当前 Sites/Worker 构建产物；
- `node_modules/`：安装依赖产生，不应提交。

## 13. GitHub Pages 能做什么、不能做什么

当前 Mask Taster 的状态和判定都在浏览器内运行，所以适合 GitHub Pages。

GitHub Pages 本身不能安全保存：

- API key；
- 私密数据库；
- 服务端 AI 调用；
- 登录后的私人数据；
- 需要隐藏的判定逻辑。

如果以后加入真正的在线 AI 判定，前端不能直接保存模型 API key。届时需要单独的后端或 serverless function；那一部分不能只靠 GitHub Pages。

## 14. 最终核对表

第一次宣布上线前逐项检查：

- [ ] GitHub 仓库已经建立；
- [ ] `main` 分支包含完整源代码；
- [ ] `.github/workflows/deploy-pages.yml` 存在；
- [ ] `Settings > Pages > Source` 是 `GitHub Actions`；
- [ ] 最新 Actions 的 `build` 和 `deploy` 都是绿色；
- [ ] Pages 地址能在未登录 GitHub的无痕窗口打开；
- [ ] Camel 与 Exercise Balls 都能进入；
- [ ] Alex 与鸭子图片正常；
- [ ] 撤回、Hand to Alex、Defend 和返回任务列表可用；
- [ ] 手机窄屏没有关键按钮无法触及；
- [ ] 仓库中没有 `.env`、密钥、私人素材或不准备公开的节目文件。

完成以上步骤后，网站不依赖 ChatGPT 登录，访问者只需要普通浏览器。
