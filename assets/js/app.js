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
          window.location.href = 'index.html';
          return;
      }
      document.getElementById('userRole').textContent = user.role === 'trader' ? '贸易商' : '客户';

      // **在客户面板显示客户详细信息 (可选)**
      if (user.role === 'customer') {
          const customerDetailsDiv = document.createElement('div');
          customerDetailsDiv.innerHTML = `<h5>客户信息</h5>
              <p><strong>客户代码:</strong> ${user.client_code || 'N/A'}</p>
              <p><strong>邮箱:</strong> ${user.email || 'N/A'}</p>
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
          window.location.href = 'index.html'; // 登出后回到首页
      };

      // **数据加载逻辑：优先从 localStorage 加载，否则从 shipments.json 加载**
      let shipments = JSON.parse(localStorage.getItem('shipments') || 'null'); // 尝试从 localStorage 读取

      if (shipments) {
          console.log("Loaded Shipments Data from localStorage:", shipments);
          // 如果 localStorage 有数据，直接处理并渲染
          handleShipmentsData(shipments, user);
      } else {
          // 如果 localStorage 没有数据，从 shipments.json 加载
          console.log("No shipments data in localStorage, fetching from shipments.json...");
          fetch('/shipments.json')
            .then(res => {
                if (!res.ok) { // 添加对 shipments.json fetch 错误的检查
                    throw new Error(`Error fetching shipments.json: ${res.status} - ${res.statusText}`);
                }
                return res.json();
            })
            .then(fetchedShipments => {
              console.log("Fetched Shipments Data from file:", fetchedShipments);
              // 将从文件加载的数据保存到 localStorage
              localStorage.setItem('shipments', JSON.stringify(fetchedShipments));
              shipments = fetchedShipments; // 更新 shipments 变量
              // 处理并渲染数据
              handleShipmentsData(shipments, user);
            })
            .catch(error => {
              console.error("Error loading initial shipments data from shipments.json:", error); // 添加详细错误日志
              // 显示加载运单数据失败的错误
               if (window.location.pathname.endsWith('dashboard.html')) {
                   document.getElementById('shipmentTableContainer').innerHTML = `<p class="text-danger">加载运单数据失败: ${error.message}. 请检查 shipments.json 文件是否存在且格式正确。</p>`;
                   document.getElementById('customerShipmentTableContainer').innerHTML = `<p class="text-danger">加载运单数据失败: ${error.message}. 请检查 shipments.json 文件是否存在且格式正确。</p>`;
               }
            });
      }

      // **Helper function to handle rendering, search, and export after data is loaded**
      // This function will operate on the 'shipments' array (either from localStorage or initial fetch)
      function handleShipmentsData(currentShipments, currentUser) {
          // **将贸易商和客户的表格渲染和相关逻辑放在这里**
          if (currentUser.role === 'trader') {
            document.getElementById('traderPanel').style.display = '';
            // 贸易商相关的表格渲染、搜索、增删改逻辑
            renderShipmentsTable(currentShipments, 'shipmentTableContainer', true);

            // 搜索功能 (现在操作 currentShipments)
            document.getElementById('traderSearchInput').addEventListener('input', function() {
                const keyword = this.value.trim();
                const filtered = currentShipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.client_code || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                );
                renderShipmentsTable(filtered, 'shipmentTableContainer', true, keyword);
            });

            // 导出功能 (现在操作 currentShipments)
            document.getElementById('traderExportBtn').onclick = function() {
                 const keyword = document.getElementById('traderSearchInput').value.trim();
                 const filtered = currentShipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.client_code || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                 );
                 // 导出时使用当前过滤后的数据
                 exportShipmentsToCSV(filtered, 'shipments_trader.csv');
             };

             // **新增/编辑/删除逻辑现在将操作 localStorage 中的数据**
             // 需要更新这些函数，使其修改全局或闭包中的 shipments 数组，并更新 localStorage
             // 同时，需要更新模态框表单字段以匹配 shipments.json 的字段
             // 注意：这些函数需要在 handleShipmentsData 内部或能够访问到 shipments 变量的范围定义

          } else if (currentUser.role === 'customer') {
            document.getElementById('customerPanel').style.display = '';
            // 客户相关的表格渲染、搜索逻辑 (操作 currentShipments)
            const myShipments = currentShipments.filter(s => s.client_code === currentUser.client_code); // **使用 user.client_code** 从合并后的 user 对象中获取
            renderShipmentsTable(myShipments, 'customerShipmentTableContainer', false);

            // 搜索功能 (现在操作 myShipments)
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

             // 导出功能 (现在操作 myShipments)
            document.getElementById('customerExportBtn').onclick = function() {
                 const keyword = document.getElementById('customerSearchInput').value.trim();
                 const filtered = myShipments.filter(s =>
                    String(s.tracking_number || '').includes(keyword) ||
                    String(s.transport_mode || '').includes(keyword) ||
                    String(s.status || '').includes(keyword) ||
                    String(s.destination || '').includes(keyword) ||
                    String(s.shipped_date || '').includes(keyword)
                 );
                 // 导出时使用当前过滤后的数据
                 exportShipmentsToCSV(filtered, 'shipments_customer.csv');
            };
          }
      }
      // End of handleShipmentsData function

      // **Handle Shipment Form Submission (Add/Edit)**
      const shipmentForm = document.getElementById('shipmentForm');
      if (shipmentForm) {
        shipmentForm.addEventListener('submit', function(e) {
          e.preventDefault();

          const trackingNumber = document.getElementById('formTrackingNumber').value.trim();
          const clientCode = document.getElementById('formClientCode').value.trim();
          const transportMode = document.getElementById('formTransportMode').value.trim();
          const status = document.getElementById('formStatus').value;
          const shippedDate = document.getElementById('formShippedDate').value;
          const destination = document.getElementById('formDestination').value.trim();
          const itemsCount = parseInt(document.getElementById('formItemsCount').value, 10);
          const totalWeight = parseFloat(document.getElementById('formTotalWeight').value);

          let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
          const isEditing = shipmentForm.dataset.editingId ? true : false; // Check if editing

          if (isEditing) {
            // **Edit Existing Shipment**
            const trackingNumberToEdit = shipmentForm.dataset.editingId;
            const index = shipments.findIndex(s => s.tracking_number === trackingNumberToEdit);
            if (index !== -1) {
              // Update the existing shipment object
              shipments[index].tracking_number = trackingNumber; // Allow editing tracking number? Usually not.
              shipments[index].client_code = clientCode;
              shipments[index].transport_mode = transportMode;
              shipments[index].status = status;
              shipments[index].shipped_date = shippedDate;
              shipments[index].destination = destination;
              shipments[index].items_count = itemsCount;
              shipments[index].total_weight = totalWeight;
              // Keep original created_at

              alert("运单已在当前浏览器中修改，但尚未保存到服务器。请记得导出数据并手动更新源文件！");
            } else {
              console.error("Shipment not found for editing:", trackingNumberToEdit);
              alert("编辑失败：未找到对应运单。");
            }
          } else {
            // **Add New Shipment**
            // Basic validation: Check if tracking number already exists (rudimentary)
            if (shipments.some(s => s.tracking_number === trackingNumber)) {
                 alert("新增失败：运单编号已存在。");
                 return;
            }

            const newShipment = {
              tracking_number: trackingNumber,
              client_code: clientCode,
              transport_mode: transportMode,
              status: status,
              created_at: new Date().toISOString().split('T')[0], // Auto-generate creation date (YYYY-MM-DD)
              shipped_date: shippedDate,
              destination: destination,
              items_count: itemsCount,
              total_weight: totalWeight
            };
            shipments.push(newShipment);
            alert("运单已在当前浏览器中添加，但尚未保存到服务器。请记得导出数据并手动更新源文件！");
          }

          // Save updated shipments to localStorage
          localStorage.setItem('shipments', JSON.stringify(shipments));

          // Re-render the table for the current user role
          const user = JSON.parse(sessionStorage.getItem('currentUser'));
          if (user && user.role === 'trader') {
              // Re-render the filtered list if search is active, otherwise render all from localStorage
              const currentKeyword = document.getElementById('traderSearchInput').value.trim();
              if (currentKeyword) {
                  const filteredShipments = shipments.filter(s =>
                      String(s.tracking_number || '').includes(currentKeyword) ||
                      String(s.client_code || '').includes(currentKeyword) ||
                      String(s.transport_mode || '').includes(currentKeyword) ||
                      String(s.status || '').includes(currentKeyword) ||
                      String(s.destination || '').includes(currentKeyword) ||
                      String(s.shipped_date || '').includes(currentKeyword)
                  );
                  renderShipmentsTable(filteredShipments, 'shipmentTableContainer', true, currentKeyword);
              } else {
                  renderShipmentsTable(shipments, 'shipmentTableContainer', true);
              }
          }

          // Add a temporary data modified flag
          sessionStorage.setItem('dataModified', 'true');

          // Hide the modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
          if (modal) modal.hide();

           // Clear form fields after submission
           shipmentForm.reset();
           delete shipmentForm.dataset.editingId; // Clear editing flag
        });

        // **Handle Add New Shipment Button Click**
        const addShipmentBtn = document.querySelector('#traderPanel button[data-bs-target="#addModal"]');
        if (addShipmentBtn) {
            addShipmentBtn.addEventListener('click', function() {
                // Clear the form for a new entry
                shipmentForm.reset();
                delete shipmentForm.dataset.editingId; // Ensure editing flag is cleared
                document.getElementById('addModalLabel').textContent = '新增运单'; // Set modal title
                // Potentially disable tracking number field in edit mode, enable in add mode
                document.getElementById('formTrackingNumber').disabled = false; // Enable for add
            });
        }

      }

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


function editShipment(trackingNumber) {
    let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
    const shipmentToEdit = shipments.find(s => s.tracking_number === trackingNumber); // Find by tracking_number
    if (shipmentToEdit) {
        // Populate the modal form with existing data
        document.getElementById('shipmentId').value = shipmentToEdit.tracking_number; // Store tracking_number in hidden field
        document.getElementById('formTrackingNumber').value = shipmentToEdit.tracking_number;
        document.getElementById('formClientCode').value = shipmentToEdit.client_code;
        document.getElementById('formTransportMode').value = shipmentToEdit.transport_mode;
        document.getElementById('formStatus').value = shipmentToEdit.status;
        document.getElementById('formShippedDate').value = shipmentToEdit.shipped_date;
        document.getElementById('formDestination').value = shipmentToEdit.destination;
        document.getElementById('formItemsCount').value = shipmentToEdit.items_count;
        document.getElementById('formTotalWeight').value = shipmentToEdit.total_weight;

        // Set a flag or store the trackingNumber in modal to know if it's an edit
        shipmentForm.dataset.editingId = trackingNumber; // Set editing flag
        document.getElementById('addModalLabel').textContent = '编辑运单'; // Set modal title

        // Disable tracking number field when editing
        document.getElementById('formTrackingNumber').disabled = true;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('addModal')); // Assumes one modal for add/edit
        modal.show();

    } else {
        console.error("Shipment not found for editing:", trackingNumber);
        alert("编辑失败：未找到对应运单。");
    }
};

function deleteShipment(trackingNumber) {
  if (!confirm('确定要删除该运单吗？此操作仅影响当前浏览器中的数据，不会同步到服务器。')) return; // Add warning
  let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
  shipments = shipments.filter(s => s.tracking_number !== trackingNumber); // Filter by tracking_number
  localStorage.setItem('shipments', JSON.stringify(shipments));

  // Re-render the table for the current user role
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (user) {
      if (user.role === 'trader') {
          // Re-render the filtered list if search is active, otherwise render all from localStorage
          const currentKeyword = document.getElementById('traderSearchInput').value.trim();
          if (currentKeyword) {
              const filteredShipments = shipments.filter(s =>
                  String(s.tracking_number || '').includes(currentKeyword) ||
                  String(s.client_code || '').includes(currentKeyword) ||
                  String(s.transport_mode || '').includes(currentKeyword) ||
                  String(s.status || '').includes(currentKeyword) ||
                  String(s.destination || '').includes(currentKeyword) ||
                  String(s.shipped_date || '').includes(currentKeyword)
              );
              renderShipmentsTable(filteredShipments, 'shipmentTableContainer', true, currentKeyword);
          } else {
              renderShipmentsTable(shipments, 'shipmentTableContainer', true);
          }

      } // Customer role does not have delete, so no need to handle
  }
   // Add a temporary data modified flag
   sessionStorage.setItem('dataModified', 'true');
   alert("运单已在当前浏览器中删除，但尚未保存到服务器。请记得导出数据并手动更新源文件！");
};

// Function to handle beforeunload event
window.addEventListener('beforeunload', function(e) {
    if (sessionStorage.getItem('dataModified') === 'true') {
        // Ask for confirmation
        const confirmationMessage = '您有未保存的更改，离开页面可能会丢失。确定要离开吗？';
        (e || window.event).returnValue = confirmationMessage; // Standard for most browsers
        return confirmationMessage; // For some older browsers
    }
});

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

  // After successful export:
  sessionStorage.removeItem('dataModified'); // Reset the flag
  alert("数据已导出为 CSV。请手动替换服务器上的源文件。请注意，此次导出已重置未保存更改提示。");
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