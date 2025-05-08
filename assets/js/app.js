// 示例用户数据（实际可从 _data/users.json 读取后存入 localStorage）
const defaultUsers = [
    { username: "trader1", password: "123456", role: "trader" },
    { username: "customerA", password: "abc123", role: "customer", customer_code: "CUST001" }
  ];
  
  // 初始化用户数据到 localStorage
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        const errorDiv = document.getElementById('loginError');
        if (user) {
          // 登录成功，保存当前用户到 sessionStorage
          sessionStorage.setItem('currentUser', JSON.stringify(user));
          // 跳转到看板页面
          window.location.href = 'dashboard.html';
        } else {
          errorDiv.textContent = "用户名或密码错误";
          errorDiv.style.display = "block";
        }
      });
    }
  });