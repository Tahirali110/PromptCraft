# Contributing to PromptCraft

First off, thank you for considering contributing to PromptCraft! 🎉  We welcome contributions from everyone.

By participating in this project, you agree to abide by our guidelines to ensure a welcoming and collaborative environment.

## 🧠 How Can I Contribute?

### 🐛 Reporting Bugs
If you find a bug, please create an issue on GitHub. Before creating a new issue, please check if a similar issue already exists.
When creating an issue, include:
- A clear and descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Context (OS, app version, error logs etc.).

### 💡 Suggesting Enhancements
Have a great idea for a new feature? We'd love to hear it! Open an issue to discuss it before you start coding to ensure it aligns with the project's vision.

### 💻 Code Contributions (Pull Requests)
1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/Tahirali110/PromptCraft.git
   cd PromptCraft
   ```
3. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
4. **Make your changes**. Ensure your code follows the project's style and conventions.
5. **Test your changes** thoroughly. (Run backend tests/linting if applicable, verify mobile UI works).
6. **Commit your changes** with descriptive commit messages:
   ```bash
   git commit -m "feat: add support for groq provider"
   # or
   git commit -m "fix: resolve theme toggle glitch"
   ```
7. **Push to your fork**:
   ```bash
   git push origin your-branch-name
   ```
8. **Open a Pull Request** against the `main` branch of the original repository.

## 📏 Coding Guidelines & Rules

To keep the codebase maintainable, please follow these rules:

### 1. Maintain the Architecture
- **Backend First:** All AI API calls and secrets MUST go through the backend proxy. Do not add API keys or direct provider SDK calls to the frontend application.
- **Frontend Independence:** Keep the Expo mobile app lightweight. Let the backend handle heavy lifting.

### 2. Code Style
- Use **TypeScript** strictly. Avoid using `any` unless absolutely necessary.
- Use **ESLint** and **Prettier** for formatting. Run the lint script before committing:
  ```bash
  # In frontend or backend directory
  bun run format
  ```
- Use descriptive variable and function names.

### 3. UI/UX Rules (Frontend)
- Maintain the **Dynamic Design** philosophy. Use smooth animations (react-native-reanimated) and avoid instant, jarring UI changes.
- Ensure the app looks great in both **Dark Mode and Light Mode**, adhering to the established color tokens.
- Do not use TailwindCSS/NativeWind indiscriminately; follow the existing design system patterns.

### 4. Security Rules (Backend)
- All new routes must have rate limiting applied.
- All incoming requests must be validated using Zod schemas.
- Do not log sensitive information (like user prompts or API keys).

## 🆘 Getting Help

If you need help or have questions about where to start, feel free to open a Discussion on GitHub or comment on an existing issue.

We appreciate all your contributions and look forward to building PromptCraft together! 🚀
