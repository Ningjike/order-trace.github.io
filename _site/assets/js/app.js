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
    shipment_id: "NTS2304_Elec_10_20250506123000",
    port_timezone: 8,
    customer_code: "NTS-2304",
    goods_short: "Elec",
    goods_detail: "电子元件，型号ABC123",
    package_count: 10,
    transport_mode: "Sea",
    estimated_days: 30,
    status: "未发货",
    created_at: "2025-05-06 12:30:00",
    sent_date: "2025-05-07",
    arrived_date: "2025-06-06",
    picked_date: "2025-06-07"
  }
];

// 初始化运单数据到 localStorage
if (!localStorage.getItem('shipments')) {
  localStorage.setItem('shipments', JSON.stringify(defaultShipments));
}

const defaultCustomers = [
  {
    customer_code: "NTS-2304",
    name: "Ruixin",
    contact: "+966 551234567",
    country: "SA",
    language: "ar",
    timezone: 3
  }
];

// 初始化客户数据到 localStorage
if (!localStorage.getItem('customers')) {
  localStorage.setItem('customers', JSON.stringify(defaultCustomers));
}

function getStatusBadge(status) {
  if (status.includes('已发货')) return `<span class="badge bg-success">${status}</span>`;
  if (status.includes('待发货')) return `<span class="badge bg-warning text-dark">${status}</span>`;
  if (status.includes('异常')) return `<span class="badge bg-danger">${status}</span>`;
  return `<span class="badge bg-secondary">${status}</span>`;
}

function renderShipmentsTable(shipments, containerId, isTrader, keyword = '') {
  let html = `<table class="table table-bordered table-hover align-middle">
    <thead class="table-light">
      <tr>
        <th>运单编号</th>
        <th>客户代码</th>
        <th>发货港口时区</th>
        <th>货物简称</th>
        <th>货物明细</th>
        <th>包裹数量</th>
        <th>运输方式</th>
        <th>预计运输天数</th>
        <th>状态</th>
        <th>发货日期</th>
        <th>到达时间</th>
        <th>提货时间</th>
        ${isTrader ? '<th>操作</th>' : ''}
      </tr>
    </thead>
    <tbody>`;
  if (shipments.length === 0) {
    html += `<tr><td colspan="${isTrader ? 13 : 12}" class="text-center">暂无数据</td></tr>`;
  } else {
    shipments.forEach(s => {
      const highlight = (text) => keyword ? String(text).replace(new RegExp(keyword, 'gi'), m => `<mark>${m}</mark>`) : text;
      html += `<tr>
        <td>${highlight(s.shipment_id)}</td>
        <td>${highlight(s.customer_code)}</td>
        <td>${highlight(s.port_timezone)}</td>
        <td>${highlight(s.goods_short)}</td>
        <td>${highlight(s.goods_detail)}</td>
        <td>${highlight(s.package_count)}</td>
        <td>${highlight(s.transport_mode)}</td>
        <td>${highlight(s.estimated_days)}</td>
        <td>${getStatusBadge(highlight(s.status))}</td>
        <td>${highlight(s.sent_date)}</td>
        <td>${highlight(s.arrived_date)}</td>
        <td>${highlight(s.picked_date)}</td>
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

function exportShipmentsToCSV(shipments, filename = 'shipments.csv') {
  if (!shipments || shipments.length === 0) {
    alert('没有可导出的数据！');
    return;
  }
  const header = ['运单编号', '客户代码', '发货日期', '货物信息', '状态', '备注'];
  const rows = shipments.map(s => [
    s.shipment_id, s.customer_code, s.date, s.goods, s.status, s.remark || ''
  ]);
  let csvContent = header.join(',') + '\n' + rows.map(r => r.map(x => `"${(x || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  // 关键：加上UTF-8 BOM
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSV解析函数
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i] ? values[i].trim() : '';
    });
    return obj;
  });
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

    // 用fetch读取根目录下的shipments.json
    fetch('/shipments.json')
      .then(res => res.json())
      .then(shipments => {
        if (user.role === 'trader') {
          document.getElementById('traderPanel').style.display = '';
          renderShipmentsTable(shipments, 'shipmentTableContainer', true);
        } else if (user.role === 'customer') {
          document.getElementById('customerPanel').style.display = '';
          const myShipments = shipments.filter(s => s.customer_code === user.customer_code);
          renderShipmentsTable(myShipments, 'customerShipmentTableContainer', false);
        }
      });
  }
});