# Setup

How to get Relay running for development or contributing.

## Requirements

- git
- Node.js
- npm (should come with Node)

### Windows
- Install [Git](https://git-scm.com/install/windows)
- Install [Node.js](https://nodejs.org/en/download)

#### I recommend to use [scoop](https://scoop.sh/) to install all of these on Windows.

```powershell
scoop install nodejs git
```


### macOS (Homebrew)
```bash
brew update
brew install node git
```

### Linux (Arch)
```bash
sudo pacman -S nodejs npm git
```

## Building / Running

Clone the repo:
```bash
git clone https://github.com/QuintixLabs/Relay.git
cd Relay
```

Install dependencies:
```bash
npm install
```

Create your env:
```bash
cp .env.example .env
```
> [!WARNING]  
> Set `DEV_MODE=development` in `.env` so **HTML/JS/CSS** are served with no cache and changes show on reload.

Start dev server:
```bash
npm run dev
```
App runs at : http://127.0.0.1:3010.

#

#### [02. Project Structure ➔](/docs/contents/02_PROJECT_STRUCTURE.md)