document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const errorDiv = document.getElementById('loginError');

      // 从 /clients.json 文件获取客户数据（包含登录信息）
      fetch('/clients.json')
        .then(res => {
          if (!res.ok) {
            throw new Error(`Error fetching clients.json: ${res.status}`);
          }
          return res.json();
        })
        .then(clients => {
          // 在获取的客户数据中查找匹配用户名和密码的用户
          const user = clients.find(client => client.username === username && client.password === password);

          // 注意：贸易商用户（trader）目前不在 clients.json 中，需要单独处理或另外存储。
          // 假设贸易商用户仍然使用硬编码或另一个 users.json 文件。
          // 为了简化，这里先假设只有客户会从 clients.json 登录。
          // 如果需要支持贸易商登录，需要合并 users.json 和 clients.json 的数据。

          if (user) {
            // 登录成功，保存当前用户到 sessionStorage
            // 注意：这里 user 对象是客户数据，role 需要根据情况设置，或者在 clients.md 中添加 role 字段
             if (!user.role) {
                user.role = 'customer'; // 默认客户角色
             }
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            // 跳转到看板页面
            window.location.href = 'dashboard.html';
          } else {
            // 如果在 clients.json 中没找到，可以尝试从硬编码的贸易商用户中查找 (如果需要)
             const defaultUsers = [ { username: "trader1", password: "123456", role: "trader" } ]; // 临时硬编码贸易商
             const traderUser = defaultUsers.find(u => u.username === username && u.password === password);

             if (traderUser) {
                 sessionStorage.setItem('currentUser', JSON.stringify(traderUser));
                 window.location.href = 'dashboard.html';
             } else {
                errorDiv.textContent = "用户名或密码错误";
                errorDiv.style.display = "block";
             }
          }
        })
        .catch(error => {
          console.error("Login failed:", error);
          errorDiv.textContent = "加载用户数据失败，请稍后再试。"; // 用户友好提示
          errorDiv.style.display = "block";
        });
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
        <th>运单编号</th>         <!-- tracking_number -->
        <th>客户代码</th>         <!-- client_code -->
        <th>运输方式</th>         <!-- transport_mode -->
        <th>状态</th>             <!-- status -->
        <th>建立时间</th>         <!-- created_at -->
        <th>发货日期</th>         <!-- shipped_date -->
        <th>目的地</th>           <!-- destination -->
        <th>物品数量</th>         <!-- items_count -->
        <th>总重量</th>           <!-- total_weight -->
        ${isTrader ? '<th>操作</th>' : ''}
      </tr>
    </thead>
    <tbody>`;
  if (shipments.length === 0) {
    html += `<tr><td colspan="${isTrader ? 10 : 9}" class="text-center">暂无数据</td></tr>`; // 调整 colspan
  } else {
    shipments.forEach(s => {
      // 确保字段存在且非 null/undefined 再高亮
      const highlight = (text) => {
        const str = String(text || ''); // 将 text 转换为字符串，避免 undefined/null 报错
        return keyword ? str.replace(new RegExp(keyword, 'gi'), m => `<mark>${m}</mark>`) : str;
      };
      html += `<tr>
        <td>${highlight(s.tracking_number)}</td>
        <td>${highlight(s.client_code)}</td>
        <td>${highlight(s.transport_mode)}</td>
        <td>${getStatusBadge(highlight(s.status))}</td>
        <td>${highlight(s.created_at)}</td>
        <td>${highlight(s.shipped_date)}</td>
        <td>${highlight(s.destination)}</td>
        <td>${highlight(s.items_count)}</td>
        <td>${highlight(s.total_weight)}</td>
        ${isTrader ? `<td>
          <!-- 注意：编辑/删除功能可能需要调整以匹配新字段名 -->
          <button class="btn btn-sm btn-primary me-1" onclick="editShipment('${s.tracking_number}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteShipment('${s.tracking_number}')">删除</button>
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

document.addEventListener('DOMContentLoaded', function () {
  // 登录页面逻辑已在前面实现

  // 看板页面逻辑
  if (window.location.pathname.endsWith('dashboard.html')) {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    document.getElementById('userRole').textContent = user.role === 'trader' ? '贸易商' : '客户';

    document.getElementById('logoutBtn').onclick = function () {
      sessionStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    };

    // 用fetch读取根目录下的shipments.json
    fetch('/shipments.json')
      .then(res => res.json())
      .then(shipments => {
        console.log("Fetched Shipments Data:", shipments);
        if (user.role === 'trader') {
          document.getElementById('traderPanel').style.display = '';
          renderShipmentsTable(shipments, 'shipmentTableContainer', true);
        } else if (user.role === 'customer') {
          document.getElementById('customerPanel').style.display = '';
          const myShipments = shipments.filter(s => s.client_code === user.customer_code);
          renderShipmentsTable(myShipments, 'customerShipmentTableContainer', false);
        }
      })
      .catch(error => {
        console.error("Error fetching shipments.json:", error);
      });
  }
});