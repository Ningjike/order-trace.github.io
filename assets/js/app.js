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
  // 示例运单数据（实际可从 _data/shipments.json 读取后存入 localStorage）
const defaultShipments = [
  {
    shipment_id: "SHP001",
    customer_code: "CUST001",
    date: "2024-06-01",
    goods: "电子产品",
    status: "已发货",
    remark: ""
  }
];

// 初始化运单数据到 localStorage
if (!localStorage.getItem('shipments')) {
  localStorage.setItem('shipments', JSON.stringify(defaultShipments));
}

function renderShipmentsTable(shipments, containerId, isTrader, keyword = '') {
  let html = `<table class="table table-bordered table-hover align-middle">
    <thead class="table-light">
      <tr>
        <th>运单编号</th>
        <th>客户代码</th>
        <th>发货日期</th>
        <th>货物信息</th>
        <th>状态</th>
        <th>备注</th>
        ${isTrader ? '<th>操作</th>' : ''}
      </tr>
    </thead>
    <tbody>`;
  if (shipments.length === 0) {
    html += `<tr><td colspan="${isTrader ? 7 : 6}" class="text-center">暂无数据</td></tr>`;
  } else {
    shipments.forEach(s => {
      // 高亮关键词（可选）
      const highlight = (text) => keyword ? text.replace(new RegExp(keyword, 'gi'), m => `<mark>${m}</mark>`) : text;
      html += `<tr>
        <td>${highlight(s.shipment_id)}</td>
        <td>${highlight(s.customer_code)}</td>
        <td>${highlight(s.date)}</td>
        <td>${highlight(s.goods)}</td>
        <td>${highlight(s.status)}</td>
        <td>${highlight(s.remark || '')}</td>
        ${isTrader ? `<td>
          <button class="btn btn-sm btn-primary me-1" onclick="editShipment('${s.shipment_id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteShipment('${s.shipment_id}')">删除</button>
        </td>` : ''}
      </tr>`;
    });
  }
  html += `</tbody></table>`;
  document.getElementById(containerId).innerHTML = html;
}

function editShipment(shipmentId) {
  const shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
  const s = shipments.find(x => x.shipment_id === shipmentId);
  if (s) {
    document.getElementById('shipmentId').value = s.shipment_id;
    document.getElementById('formCustomerCode').value = s.customer_code;
    document.getElementById('formDate').value = s.date;
    document.getElementById('formGoods').value = s.goods;
    document.getElementById('formStatus').value = s.status;
    document.getElementById('formRemark').value = s.remark || '';
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  }
}

function deleteShipment(shipmentId) {
  if (!confirm('确定要删除该运单吗？')) return;
  let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
  shipments = shipments.filter(s => s.shipment_id !== shipmentId);
  localStorage.setItem('shipments', JSON.stringify(shipments));
  renderShipmentsTable(shipments, 'shipmentTableContainer', true);
}

document.addEventListener('DOMContentLoaded', function() {
  // 登录页面逻辑已在前面实现

  // 看板页面逻辑
  if (window.location.pathname.endsWith('dashboard.html')) {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    document.getElementById('userRole').textContent = user.role === 'trader' ? '贸易商' : '客户';

    document.getElementById('logoutBtn').onclick = function() {
      sessionStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    };

    const shipments = JSON.parse(localStorage.getItem('shipments') || '[]');

    if (user.role === 'trader') {
      document.getElementById('traderPanel').style.display = '';
      // 每次都从localStorage获取最新数据
      function refreshTraderTable(keyword = '') {
        const shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
        let filtered = shipments;
        if (keyword) {
          filtered = shipments.filter(s =>
            s.customer_code.includes(keyword) ||
            s.status.includes(keyword) ||
            s.date.includes(keyword) ||
            s.goods.includes(keyword)
          );
        }
        renderShipmentsTable(filtered, 'shipmentTableContainer', true, keyword);
      }

      refreshTraderTable();

      // 新增/编辑运单表单提交
      document.getElementById('shipmentForm').onsubmit = function(e) {
        e.preventDefault();
        let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
        const shipmentId = document.getElementById('shipmentId').value.trim();
        const customerCode = document.getElementById('formCustomerCode').value.trim();
        const date = document.getElementById('formDate').value;
        const goods = document.getElementById('formGoods').value.trim();
        const status = document.getElementById('formStatus').value.trim();
        const remark = document.getElementById('formRemark').value.trim();

        if (shipmentId) {
          // 编辑
          const idx = shipments.findIndex(s => s.shipment_id === shipmentId);
          if (idx !== -1) {
            shipments[idx] = { shipment_id: shipmentId, customer_code: customerCode, date, goods, status, remark };
          }
        } else {
          // 新增
          const newId = 'SHP' + (Math.floor(Math.random() * 9000) + 1000);
          shipments.push({ shipment_id: newId, customer_code: customerCode, date, goods, status, remark });
        }
        localStorage.setItem('shipments', JSON.stringify(shipments));
        refreshTraderTable(document.getElementById('traderSearchInput').value.trim());
        // 关闭模态框
        bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
        // 清空表单
        document.getElementById('shipmentForm').reset();
        document.getElementById('shipmentId').value = '';
      };

      // 打开新增运单时清空表单
      document.getElementById('addModal').addEventListener('show.bs.modal', function() {
        document.getElementById('shipmentForm').reset();
        document.getElementById('shipmentId').value = '';
      });

      // 搜索功能
      document.getElementById('traderSearchInput').addEventListener('input', function() {
        refreshTraderTable(this.value.trim());
      });

      // 覆盖删除运单函数
      window.deleteShipment = function(shipmentId) {
        if (!confirm('确定要删除该运单吗？')) return;
        let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
        shipments = shipments.filter(s => s.shipment_id !== shipmentId);
        localStorage.setItem('shipments', JSON.stringify(shipments));
        refreshTraderTable(document.getElementById('traderSearchInput').value.trim());
      };

    } else if (user.role === 'customer') {
      document.getElementById('customerPanel').style.display = '';
      let myShipments = shipments.filter(s => s.customer_code === user.customer_code);
      renderShipmentsTable(myShipments, 'customerShipmentTableContainer', false);

      // 搜索功能
      document.getElementById('customerSearchInput').addEventListener('input', function() {
        const keyword = this.value.trim();
        const filtered = myShipments.filter(s =>
          s.status.includes(keyword) ||
          s.date.includes(keyword) ||
          s.goods.includes(keyword)
        );
        renderShipmentsTable(filtered, 'customerShipmentTableContainer', false, keyword);
      });
    }
  }
});