# Cải thiện chức năng và Dashboard cho HeadOfAdmin

## Phân tích hiện trạng

### Chức năng hiện tại của HeadOfAdmin:
1. ✅ Dashboard (thống kê cơ bản)
2. ✅ News Management (duyệt/từ chối news)
3. ✅ Semester Management (chỉ xem danh sách)
4. ✅ Staff Management (chỉ xem danh sách)

### Chức năng của StaffOfAdmin (để tham khảo):
1. User Management (Admin, Head, Staff, Lecturer, Student)
2. Room Management (xem, thêm, sửa, xóa)
3. Semester Management (xem, thêm, sửa, xóa)
4. News Management

### Vấn đề Dashboard hiện tại:
1. ❌ Staff count không được fetch (luôn = 0)
2. ❌ Chỉ có 4 cards thống kê đơn giản
3. ❌ Quick Actions có button trùng lặp (Semester Management 2 lần)
4. ❌ Thiếu thống kê quan trọng: Active Semesters, Rooms, Staff by Department
5. ❌ Không có visualizations/charts
6. ❌ Layout chưa tối ưu, thiếu thông tin hữu ích

---

## Đề xuất cải thiện

### 1. Thêm chức năng quản lý cho HeadOfAdmin

#### Phương án 1.1: Room Management (Đề xuất)
- **Lý do**: HeadOfAdmin cần xem danh sách phòng để quản lý tài nguyên
- **Quyền hạn**: Chỉ xem (read-only), không add/edit/delete
- **Implementation**: 
  - Thêm route `/headOfAdmin/rooms` 
  - Sử dụng component `RoomList` với prop `hideActions={true}` (tương tự SemesterList)
  - Thêm vào sidebar menu

#### Phương án 1.2: Department Management (Tùy chọn)
- **Lý do**: Xem thống kê staff theo department
- **Quyền hạn**: Chỉ xem danh sách departments và số lượng staff
- **Implementation**: 
  - Có thể tích hợp vào Dashboard thay vì tạo trang riêng
  - Hoặc tạo trang riêng nếu cần chi tiết

---

### 2. Cải thiện Dashboard

#### Phương án 2.1: Thêm thống kê quan trọng (Bắt buộc)
- ✅ Fetch đúng số lượng Staff (roles 6, 7)
- ✅ Thêm thống kê: Active Semesters, Total Rooms, Active Rooms
- ✅ Thêm thống kê: Staff by Department (Administration vs Academic)
- ✅ Thêm thống kê: News by Status (Pending, Published, Rejected)

#### Phương án 2.2: Cải thiện UI/UX (Đề xuất)
- ✅ Cải thiện cards: thêm gradient, icons đẹp hơn, hover effects
- ✅ Thêm color coding: màu sắc phân biệt rõ ràng cho từng loại thống kê
- ✅ Responsive layout: tối ưu cho mobile/tablet
- ✅ Thêm loading skeletons thay vì spinner đơn giản

#### Phương án 2.3: Thêm visualizations (Tùy chọn - nếu có thời gian)
- 📊 Pie chart: News by Status
- 📊 Bar chart: Staff by Department
- 📊 Timeline: Recent Semesters
- 📊 Mini charts trong statistic cards

#### Phương án 2.4: Cải thiện nội dung (Bắt buộc)
- ✅ Sửa Quick Actions: loại bỏ duplicate, thêm Room Management
- ✅ Thêm Recent Activities section: hiển thị các hoạt động gần đây
- ✅ Thêm Important Notifications: cảnh báo nếu có news pending quá lâu
- ✅ Cải thiện tables: thêm pagination, better styling

---

## Plan thực hiện

### Phase 1: Thêm Room Management (Ưu tiên cao)
1. Thêm route `/headOfAdmin/rooms` trong App.js
2. Thêm prop `hideActions` vào RoomList component
3. Cập nhật RoomList để hỗ trợ `hideActions={true}`
4. Thêm menu item "Room Management" vào sidebar
5. Test và verify

### Phase 2: Fix và cải thiện Dashboard (Ưu tiên cao)
1. **Fix Staff count:**
   - Fetch users với roles [6, 7] từ API
   - Update stats state

2. **Thêm thống kê mới:**
   - Fetch rooms data
   - Tính Active Semesters (semesters có endDate >= today)
   - Tính Staff by Department
   - Tính News by Status

3. **Cải thiện UI:**
   - Redesign statistic cards với better colors và icons
   - Fix Quick Actions (loại bỏ duplicate)
   - Cải thiện layout và spacing
   - Thêm responsive design

4. **Thêm nội dung hữu ích:**
   - Recent Activities section
   - Important Notifications
   - Better empty states

### Phase 3: Advanced features (Tùy chọn)
1. Thêm charts/visualizations (nếu cần)
2. Thêm Department Management page (nếu cần)
3. Thêm export functionality
4. Thêm filters và date range pickers

---

## Files cần thay đổi

### Phase 1:
- `FjapFE/src/vn.fpt.edu.config/App.js` - Thêm route
- `FjapFE/src/vn.fpt.edu.pages/staffOfAdmin/Room/RoomList.js` - Thêm prop hideActions
- `FjapFE/src/vn.fpt.edu.pages/layouts/headOfAdmin_layout/headOfAdmin-sidebar.js` - Thêm menu item

### Phase 2:
- `FjapFE/src/vn.fpt.edu.pages/headOfAdmin/Dashboard.js` - Cải thiện toàn bộ
- `FjapFE/src/vn.fpt.edu.api/Admin.js` - Có thể cần thêm API methods (nếu cần)

---

## Lợi ích

1. **HeadOfAdmin có đầy đủ thông tin cần thiết** để quản lý hiệu quả
2. **Dashboard trực quan và hữu ích hơn** với thống kê đầy đủ
3. **UI/UX tốt hơn** giúp người dùng dễ sử dụng
4. **Consistency** với các role khác trong hệ thống

