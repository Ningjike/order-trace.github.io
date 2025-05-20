document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const errorDiv = document.getElementById('loginError');

      // 从 /users.json 文件获取所有用户凭据数据
      fetch('/users.json')
        .then(res => {
          if (!res.ok) {
            throw new Error(`Error fetching users.json: ${res.status} - ${res.statusText}`);
          }
          return res.json();
        })
        .then(users => {
          // 在用户凭据数据中查找匹配用户名和密码的用户
          const userCredential = users.find(u => u.username === username && u.password === password);

          if (userCredential) {
            // 如果找到匹配的凭据
            if (userCredential.role === 'trader') {
                 // 贸易商直接登录成功
                 sessionStorage.setItem('currentUser', JSON.stringify(userCredential));
                 window.location.href = 'dashboard.html';
            } else if (userCredential.role === 'customer' && userCredential.client_code_ref) {
                 // 客户需要进一步获取详细信息
                 fetch('/clients_data.json') // 从客户详细信息文件获取
                    .then(res => {
                        if (!res.ok) {
                             throw new Error(`Error fetching clients_data.json: ${res.status} - ${res.statusText}`);
                        }
                        return res.json();
                    })
                    .then(clientsData => {
                        // 找到与凭据关联的客户详细信息，使用 client.client_code 与 userCredential.client_code_ref 进行匹配
                        const clientDetails = clientsData.find(client => client.client_code === userCredential.client_code_ref); // **修正：这里使用 userCredential.client_code_ref**

                        if (clientDetails) {
                            // 合并凭据和详细信息，保存到 sessionStorage
                            // 合并时确保 client_code 优先使用详细信息中的
                            const currentUser = { ...userCredential, ...clientDetails, client_code: clientDetails.client_code };
                            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                            window.location.href = 'dashboard.html';
                        } else {
                            // 凭据存在但找不到对应的客户详细信息 (clients_data.json 没问题，但数据不对)
                            console.error("Client details not found for client_code_ref:", userCredential.client_code_ref);
                            errorDiv.textContent = "用户信息不完整，请联系管理员。"; // 保持用户友好提示
                            errorDiv.style.display = "block";
                        }
                    })
                    .catch(error => {
                         console.error("Error fetching clients_data.json:", error); // 添加详细错误日志
                         errorDiv.textContent = `加载客户详细信息失败: ${error.message}. 请联系管理员。`; // 提示加载失败
                         errorDiv.style.display = "block";
                    });
            } else {
                 // 未知的用户角色 或 客户角色但缺少 client_code_ref
                 console.error("Unknown user role or missing client_code_ref:", userCredential);
                 errorDiv.textContent = "用户信息不完整或角色未知，请联系管理员。";
                 errorDiv.style.display = "block";
            }

          } else {
            // 用户名或密码不匹配
            errorDiv.textContent = "用户名或密码错误";
            errorDiv.style.display = "block";
          }
        })
        .catch(error => {
          console.error("Login failed:", error); // 添加详细错误日志
          // 显示加载用户数据失败的错误
          errorDiv.textContent = `加载用户数据失败: ${error.message}. 请联系管理员。`; // 提示加载失败
          errorDiv.style.display = "block";
        });
    });
  }

  // ... 其他看板页面相关的DOMContentLoaded逻辑 ...
  // 这部分逻辑仍然在fetch('/shipments.json') 成功后执行，并且使用 sessiongStorage 中的 currentUser 对象
  // 确保在需要客户代码的地方使用 user.client_code

   if (window.location.pathname.endsWith('dashboard.html')) {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
      if (!user) {
          window.location.href = 'login.html';
          return;
      }
      document.getElementById('userRole').textContent = user.role === 'trader' ? '贸易商' : '客户';

      // **在客户面板显示客户详细信息 (可选)**
      if (user.role === 'customer') {
          const customerDetailsDiv = document.createElement('div');
          customerDetailsDiv.innerHTML = `<h5>客户信息</h5>
              <p><strong>客户代码:</strong> ${user.client_code || 'N/A'}</p>
              <p><strong>客户姓名:</strong> ${user.name || 'N/A'}</p>
              <p><strong>联系方式:</strong> ${user.contact || 'N/A'}</p>
              <p><strong>国家:</strong> ${user.country || 'N/A'}</p>
              <p><strong>语言:</strong> ${user.language || 'N/A'}</p>
              <p><strong>时区:</strong> ${user.timezone || 'N/A'}</p>
              <hr>`;
           const customerPanel = document.getElementById('customerPanel');
           customerPanel.insertBefore(customerDetailsDiv, customerPanel.firstChild); // 在面板顶部插入
      }


      document.getElementById('logoutBtn').onclick = function() {
          sessionStorage.removeItem('currentUser');
          window.location.href = 'login.html';
      };

      // 用fetch读取根目录下的shipments.json
      fetch('/shipments.json')
        .then(res => {
            if (!res.ok) { // 添加对 shipments.json fetch 错误的检查
                throw new Error(`Error fetching shipments.json: ${res.status} - ${res.statusText}`);
            }
            return res.json();
        })
        .then(shipments => {
          console.log("Fetched Shipments Data:", shipments); // 保留日志以便调试
          // **将贸易商和客户的表格渲染和相关逻辑放在这里**
          if (user.role === 'trader') {
            document.getElementById('traderPanel').style.display = '';
            // 贸易商相关的表格渲染、搜索、增删改逻辑
            renderShipmentsTable(shipments, 'shipmentTableContainer', true);
            // 搜索功能
            document.getElementById('traderSearchInput').addEventListener('input', function() {
                const keyword = this.value.trim();
                const filtered = shipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.client_code || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                );
                renderShipmentsTable(filtered, 'shipmentTableContainer', true, keyword);
            });
            // 导出功能
            document.getElementById('traderExportBtn').onclick = function() {
                 const keyword = document.getElementById('traderSearchInput').value.trim();
                 const filtered = shipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.client_code || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                 );
                 exportShipmentsToCSV(filtered, 'shipments_trader.csv');
             };
             // 注意：新增/编辑/删除逻辑仍无效，需要后端
             // 你可以暂时隐藏或移除这些按钮，避免误触
             // 例如： document.getElementById('addModal').style.display = 'none'; // 隐藏模态框
             // document.querySelector('#traderPanel button[data-bs-target="#addModal"]').style.display = 'none'; // 隐藏新增按钮
             // 类似地，编辑/删除按钮也需要处理
             // 或者修改 editShipment 和 deleteShipment 函数提示功能不可用
             window.editShipment = function(shipmentId) { alert("编辑功能未实现持久化保存，当前不可用。"); };
             window.deleteShipment = function(shipmentId) { alert("删除功能未实现持久化保存，当前不可用。"); };


          } else if (user.role === 'customer') {
            document.getElementById('customerPanel').style.display = '';
            // 客户相关的表格渲染、搜索逻辑
            const myShipments = shipments.filter(s => s.client_code === user.client_code); // **使用 user.client_code** 从合并后的 user 对象中获取
            renderShipmentsTable(myShipments, 'customerShipmentTableContainer', false);

            // 搜索功能
            document.getElementById('customerSearchInput').addEventListener('input', function() {
                const keyword = this.value.trim();
                const filtered = myShipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                );
                renderShipmentsTable(filtered, 'customerShipmentTableContainer', false, keyword);
            });
             // 导出功能
            document.getElementById('customerExportBtn').onclick = function() {
                 const keyword = document.getElementById('customerSearchInput').value.trim();
                 const filtered = myShipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                 );
                 exportShipmentsToCSV(filtered, 'shipments_customer.csv');
            };
          }
        })
        .catch(error => {
          console.error("Error fetching shipments.json:", error); // 添加详细错误日志
          // 显示加载运单数据失败的错误
           if (window.location.pathname.endsWith('dashboard.html')) {
               document.getElementById('shipmentTableContainer').innerHTML = `<p class="text-danger">加载运单数据失败: ${error.message}. 请检查 shipments.json 文件是否存在且格式正确。</p>`;
               document.getElementById('customerShipmentTableContainer').innerHTML = `<p class="text-danger">加载运单数据失败: ${error.message}. 请检查 shipments.json 文件是否存在且格式正确。</p>`;
           }
        });
  }
});

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