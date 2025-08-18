export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能 (feature)
        'fix',      // 修复 (bug fix)
        'docs',     // 文档 (documentation)
        'style',    // 格式 (formatting, missing semi colons, etc)
        'refactor', // 重构 (refactoring code)
        'perf',     // 性能 (performance)
        'test',     // 测试 (when adding missing tests)
        'chore',    // 维护 (maintain)
        'revert',   // 回滚 (revert)
        'build',    // 构建系统 (build system)
        'ci',       // CI配置 (continuous integration)
        'security', // 安全相关 (security)
        'ui',       // UI/UX相关 (user interface)
        'release'   // 发布相关 (release)
      ]
    ],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200]
  }
};
