/* ==========================================================
   VO RECOVERY MANAGER
   script.js
   PART 1 - LOGIN + VARIABLES
==========================================================*/

// ================================
// Local Storage
// ================================

let customers = JSON.parse(localStorage.getItem("customers")) || [];
let recoveries = JSON.parse(localStorage.getItem("recoveries")) || [];
let settings = JSON.parse(localStorage.getItem("settings")) || {};

let editIndex = -1;

// ================================
// Users (Stored) - Multi-User With Roles
// ================================

function getUsers(){

    let users = JSON.parse(localStorage.getItem("users"));

    if(!users){

        // Migrate Old Single-Admin Credentials If Present
        const oldCreds = JSON.parse(localStorage.getItem("credentials"));

        if(oldCreds){

            users = [{
                username: oldCreds.username,
                password: oldCreds.password,
                role: "Admin"
            }];

        } else {

            users = [{
                username: "admin",
                password: "1234",
                role: "Admin"
            }];

        }

        localStorage.setItem("users", JSON.stringify(users));

    }

    return users;

}

function saveUsers(users){

    localStorage.setItem("users", JSON.stringify(users));

    if (typeof syncUsersToFirebase === "function") {
        syncUsersToFirebase(users);
    }

}

// ================================
// Admin Login
// ================================

function login(){

    const username = document.getElementById("username");
    const password = document.getElementById("password");

    if(!username || !password){
        return;
    }

    const user = username.value.trim();
    const pass = password.value.trim();

    const users = getUsers();

    const matched = users.find(u => u.username === user && u.password === pass);

    if(matched){

        localStorage.setItem("isLoggedIn","true");
        localStorage.setItem("currentUser", matched.username);
        localStorage.setItem("currentRole", matched.role);

        window.location.href="dashboard.html";

    }else{

        alert("Invalid Username or Password");

    }

}

// ================================
// Check Login
// ================================

function checkLogin(){

    const page = window.location.pathname;

    if(page.includes("login.html")) return;

    const login = localStorage.getItem("isLoggedIn");

    if(login!=="true"){

        window.location.href="login.html";

        return;

    }

    // Role Guard - Only Admin Can Open Settings Page

    const role = localStorage.getItem("currentRole") || "Admin";

    if(page.includes("settings.html") && role !== "Admin"){

        alert("Access Denied. Settings Is Available To Admin Only.");

        window.location.href="dashboard.html";

        return;

    }

    applyRoleRestrictions();

}

// ================================
// Apply Role-Based UI Restrictions
// ================================

function applyRoleRestrictions(){

    const role = localStorage.getItem("currentRole") || "Admin";

    // Update Visible Role Badge (Header) And Role Field (Settings Page)

    const badge = document.getElementById("userRoleBadge");

    if(badge){
        badge.innerText = role === "Admin" ? "Administrator" : "User";
    }

    const roleDisplay = document.getElementById("currentRoleDisplay");

    if(roleDisplay){
        roleDisplay.value = role === "Admin" ? "Administrator" : "User";
    }

    if(role === "Admin"){
        return;
    }

    // Hide Settings Links In Sidebar / Dashboard For Non-Admin

    document.querySelectorAll('a[href="settings.html"]').forEach(link => {

        link.style.display = "none";

    });

    // Hide User Management Section If It Somehow Renders

    const userMgmt = document.getElementById("userManagementSection");

    if(userMgmt){
        userMgmt.style.display = "none";
    }

}

// ================================
// Logout
// ================================

function logout(){

    if(confirm("Are you sure you want to logout?")){

        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("currentRole");

        window.location.href="login.html";

    }

}

// ================================
// Open Customer Modal
// ================================

function openModal(){

    const modal=document.getElementById("customerModal");

    if(modal){

        modal.style.display="block";

    }

}

// ================================
// Close Customer Modal
// ================================

function closeModal(){

    const modal=document.getElementById("customerModal");

    if(modal){

        modal.style.display="none";

    }

    const form=document.getElementById("customerForm");

    if(form){

        form.reset();

    }

    const outstanding=document.getElementById("outstanding");

    if(outstanding){

        outstanding.value="";

    }

    editIndex=-1;

}

// ================================
// Close Modal Outside Click
// ================================

window.onclick=function(event){

    const modal=document.getElementById("customerModal");

    if(modal && event.target===modal){

        closeModal();

    }

};

// ================================
// END OF PART 1
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 2 - OUTSTANDING + VALIDATION
// ==========================================================

// ================================
// Auto Outstanding Calculation
// ================================

const billInput = document.getElementById("billAmount");
const downInput = document.getElementById("downPayment");

if (billInput && downInput) {

    billInput.addEventListener("input", calculateOutstanding);
    downInput.addEventListener("input", calculateOutstanding);

}

function calculateOutstanding() {

    const bill = parseFloat(document.getElementById("billAmount").value) || 0;

    const down = parseFloat(document.getElementById("downPayment").value) || 0;

    let outstanding = bill - down;

    if (outstanding < 0) {

        outstanding = 0;

    }

    const outBox = document.getElementById("outstanding");

    if (outBox) {

        outBox.value = outstanding;

    }

}

// ================================
// Customer Form Validation
// ================================

function validateCustomerForm() {

    const name = document.getElementById("customerName");
    const mobile = document.getElementById("mobile");
    const billAmount = document.getElementById("billAmount");

    if (!name || name.value.trim() === "") {
        alert("Please Enter Customer Name");
        if (name) name.focus();
        return false;
    }

    if (!mobile || mobile.value.trim() === "") {
        alert("Please Enter Mobile Number");
        if (mobile) mobile.focus();
        return false;
    }

    if (mobile.value.trim().length < 10) {
        alert("Mobile Number Must Be 10 Digits");
        mobile.focus();
        return false;
    }

    if (billAmount && billAmount.value.trim() === "") {
        alert("Please Enter Bill Amount");
        billAmount.focus();
        return false;
    }

    return true;

}

// ================================
// Create Customer Object
// ================================

function getCustomerData() {

    return {

        id: Date.now(),

        name: document.getElementById("customerName")?.value || "",

        father: document.getElementById("fatherName")?.value || "",

        mobile: document.getElementById("mobile")?.value || "",

        altMobile: document.getElementById("altMobile")?.value || "",

        village: document.getElementById("village")?.value || "",

        taluka: document.getElementById("taluka")?.value || "",

        district: document.getElementById("district")?.value || "",

        address: document.getElementById("address")?.value || "",

        bill: document.getElementById("billAmount")?.value || 0,

        down: document.getElementById("downPayment")?.value || 0,

        outstanding: document.getElementById("outstanding")?.value || 0,

        executive: document.getElementById("executive")?.value || "",

        followup: document.getElementById("followup")?.value || "",

        remarks: document.getElementById("remarks")?.value || ""

    };

}

// ================================
// END OF PART 2
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 3 - SAVE CUSTOMER
// ==========================================================

// ================================
// Save Customer
// ================================

function saveCustomer() {

    if (!validateCustomerForm()) {

        return;

    }

    const customer = getCustomerData();

    if (editIndex === -1) {

        customers.push(customer);

    } else {

        customer.id = customers[editIndex].id;

        customers[editIndex] = customer;

    }

    localStorage.setItem(
        "customers",
        JSON.stringify(customers)
    );

    closeModal();

    loadCustomers();

    updateDashboard();

    if (typeof cloudSyncAll === "function") {
        cloudSyncAll();
    }

    alert("Customer Saved Successfully.");

}

// ================================
// Clear Customer Form
// ================================

function clearCustomerForm() {

    const form = document.getElementById("customerForm");

    if (form) {

        form.reset();

    }

    const outstanding = document.getElementById("outstanding");

    if (outstanding) {

        outstanding.value = "";

    }

    editIndex = -1;

}

// ================================
// Reload Customer Data
// ================================

function refreshCustomerData() {

    customers = JSON.parse(
        localStorage.getItem("customers")
    ) || [];

    loadCustomers();

}

// ================================
// END OF PART 3
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 4 - LOAD CUSTOMER TABLE
// ==========================================================

// ================================
// Load Customer List
// ================================

function loadCustomers() {

    const tbody = document.getElementById("customerBody");

    if (!tbody) {

        return;

    }

    const role = localStorage.getItem("currentRole") || "Admin";

    tbody.innerHTML = "";

    customers.forEach((customer, index) => {

        const deleteButton = role === "Admin" ?
            `<button onclick="deleteCustomer(${index})" title="Delete">🗑️</button>` :
            "";

        tbody.innerHTML += `

        <tr>

            <td>${index + 1}</td>

            <td>${customer.name}</td>

            <td>${customer.mobile}</td>

            <td>${customer.village}</td>

            <td>₹${customer.outstanding}</td>

            <td>${customer.followup}</td>

            <td>

                <button
                    onclick="viewCustomer(${index})"
                    title="View">
                    👁
                </button>

                <button
                    onclick="editCustomer(${index})"
                    title="Edit">
                    ✏️
                </button>

                ${deleteButton}

            </td>

        </tr>

        `;

    });

}

// ================================
// Reload Table
// ================================

function reloadTable() {

    customers = JSON.parse(
        localStorage.getItem("customers")
    ) || [];

    loadCustomers();

}

// ================================
// Total Customer Count
// ================================

function getCustomerCount() {

    return customers.length;

}

// ================================
// END OF PART 4
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 5 - EDIT + DELETE + SEARCH + VIEW
// ==========================================================

// ================================
// Edit Customer
// ================================

function editCustomer(index){

    editIndex = index;

    const c = customers[index];

    document.getElementById("customerName").value = c.name;
    document.getElementById("fatherName").value = c.father;
    document.getElementById("mobile").value = c.mobile;
    document.getElementById("altMobile").value = c.altMobile;
    document.getElementById("village").value = c.village;
    document.getElementById("taluka").value = c.taluka;
    document.getElementById("district").value = c.district;
    document.getElementById("address").value = c.address;
    document.getElementById("billAmount").value = c.bill;
    document.getElementById("downPayment").value = c.down;
    document.getElementById("outstanding").value = c.outstanding;
    document.getElementById("executive").value = c.executive;
    document.getElementById("followup").value = c.followup;
    document.getElementById("remarks").value = c.remarks;

    openModal();

}

// ================================
// Delete Customer
// ================================

function deleteCustomer(index){

    const role = localStorage.getItem("currentRole") || "Admin";

    if(role !== "Admin"){
        alert("Only Admin Can Delete Records.");
        return;
    }

    if(confirm("Delete this customer permanently?")){

        const removed = customers[index];

        customers.splice(index, 1);

        localStorage.setItem("customers", JSON.stringify(customers));

        loadCustomers();
        updateDashboard();

        if (removed && typeof cloudDeleteCustomer === "function") {
            cloudDeleteCustomer(removed.id);
        }
        if (typeof cloudSyncAll === "function") {
            cloudSyncAll();
        }

    }

}

// ================================
// Search Customer
// ================================

function searchCustomer(){

    const keyword = document
        .getElementById("searchCustomer")
        .value
        .toLowerCase();

    const rows = document.querySelectorAll("#customerBody tr");

    rows.forEach(row=>{

        if(row.innerText.toLowerCase().includes(keyword)){

            row.style.display="";

        }else{

            row.style.display="none";

        }

    });

}

// ================================
// View Customer
// ================================

function viewCustomer(index){

    const c = customers[index];

    alert(

`Customer Details

Customer : ${c.name}

Father : ${c.father}

Mobile : ${c.mobile}

Alternate : ${c.altMobile}

Village : ${c.village}

Taluka : ${c.taluka}

District : ${c.district}

Address :

${c.address}

Bill Amount : ₹${c.bill}

Down Payment : ₹${c.down}

Outstanding : ₹${c.outstanding}

Executive : ${c.executive}

Follow-up : ${c.followup}

Remarks :

${c.remarks}

`);

}

// ================================
// END OF PART 5
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 6 - DASHBOARD STATISTICS
// ==========================================================

// ================================
// Update Dashboard
// ================================

function updateDashboard() {

    const totalCustomers = document.getElementById("totalCustomers");
    const totalOutstanding = document.getElementById("totalOutstanding");
    const todayFollowup = document.getElementById("todayFollowup");
    const todayRecovery = document.getElementById("todayRecovery");

    if (!totalCustomers) return;

    customers = JSON.parse(
        localStorage.getItem("customers")
    ) || [];

    recoveries = JSON.parse(
        localStorage.getItem("recoveries")
    ) || [];

    // Total Customers

    totalCustomers.innerHTML = customers.length;

    // Total Outstanding

    let outstanding = 0;

    customers.forEach(customer => {

        outstanding += Number(customer.outstanding || 0);

    });

    totalOutstanding.innerHTML =
        "₹" + outstanding.toLocaleString("en-IN");

    // Today's Follow-up

    let today = new Date().toISOString().split("T")[0];

    let followCount = customers.filter(customer =>
        customer.followup === today
    ).length;

    if (todayFollowup) {

        todayFollowup.innerHTML = followCount;

    }

    // Today's Recovery

    let recoveryTotal = 0;

    recoveries.forEach(item => {

        if (item.date === today) {

            recoveryTotal += Number(item.amount || 0);

        }

    });

    if (todayRecovery) {

        todayRecovery.innerHTML =
            "₹" + recoveryTotal.toLocaleString("en-IN");

    }

}

// ================================
// Recent Customers
// ================================

function loadRecentCustomers() {

    const tbody =
        document.getElementById("recentCustomers");

    if (!tbody) return;

    tbody.innerHTML = "";

    customers
        .slice(-5)
        .reverse()
        .forEach((customer, index) => {

            tbody.innerHTML += `

            <tr>

                <td>${index + 1}</td>

                <td>${customer.name}</td>

                <td>${customer.mobile}</td>

                <td>${customer.village}</td>

                <td>₹${customer.outstanding}</td>

                <td>
                    <span class="badge badge-success">
                        Active
                    </span>
                </td>

            </tr>

            `;

        });

}

// ================================
// Today's Follow-up Table (Dashboard)
// ================================

function loadDashboardFollowups() {

    const tbody = document.getElementById("followupTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    const today = new Date().toISOString().split("T")[0];

    customers
        .filter(customer => customer.followup === today)
        .forEach((customer, index) => {

            tbody.innerHTML += `

            <tr>
                <td>${index + 1}</td>
                <td>${customer.name}</td>
                <td>${customer.mobile}</td>
                <td>${customer.village}</td>
                <td>₹${customer.outstanding}</td>
                <td>${customer.followup}</td>
            </tr>

            `;

        });

}

// ================================
// Recent Recovery Table (Dashboard)
// ================================

function loadDashboardRecentRecovery() {

    const tbody = document.getElementById("recoveryTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    recoveries
        .slice(-5)
        .reverse()
        .forEach((item, index) => {

            const customer = customers.find(c => c.id == item.customerId);

            tbody.innerHTML += `

            <tr>
                <td>${index + 1}</td>
                <td>${customer ? customer.name : "-"}</td>
                <td>₹${item.amount}</td>
                <td>${item.date}</td>
                <td>${item.remarks || "-"}</td>
            </tr>

            `;

        });

}

// ================================
// END OF PART 6
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 7 - RECOVERY MODULE
// ==========================================================

// ================================
// Save Recovery
// ================================

function saveRecovery() {

    const customerId = document.getElementById("recoveryCustomer");
    const amount = document.getElementById("recoveryAmount");
    const date = document.getElementById("recoveryDate");
    const remarks = document.getElementById("recoveryRemarks");
    const paymentMode = document.getElementById("paymentMode");
    const receiptNo = document.getElementById("receiptNo");
    const collectedBy = document.getElementById("collectedBy");

    if (!customerId || !amount || !date) {
        return;
    }

    if (customerId.value === "") {
        alert("Please Select Customer");
        return;
    }

    if (amount.value === "") {
        alert("Please Enter Recovery Amount");
        return;
    }

    const recovery = {
        id: Date.now(),
        customerId: customerId.value,
        amount: Number(amount.value),
        date: date.value,
        paymentMode: paymentMode ? paymentMode.value : "Cash",
        receiptNo: receiptNo ? receiptNo.value : "",
        collectedBy: collectedBy ? collectedBy.value : "",
        remarks: remarks ? remarks.value : ""
    };

    recoveries.push(recovery);

    localStorage.setItem("recoveries", JSON.stringify(recoveries));

    // Outstanding Update
    const customer = customers.find(c => c.id == customerId.value);

    if (customer) {
        customer.outstanding = Math.max(
            0,
            Number(customer.outstanding) - Number(amount.value)
        );
        localStorage.setItem("customers", JSON.stringify(customers));
    }

    // Reset form fields
    amount.value = "";
    if (remarks) remarks.value = "";
    if (receiptNo) receiptNo.value = "";
    if (paymentMode) paymentMode.selectedIndex = 0;
    if (collectedBy) collectedBy.selectedIndex = 0;
    customerId.value = "";

    loadRecoveryTable();
    updateDashboard();
    updateRecoverySummary();

    if (typeof loadReports === "function") {
        loadReports();
    }

    if (typeof cloudSyncAll === "function") {
        cloudSyncAll();
    }

    alert("Recovery Saved Successfully.");

}

// ================================
// Recovery Table
// ================================

function loadRecoveryTable() {

    const tbody = document.getElementById("recoveryBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const role = localStorage.getItem("currentRole") || "Admin";

    recoveries.forEach((item, index) => {

        const customer = customers.find(c => c.id == item.customerId);

        const deleteBtn = role === "Admin"
            ? `<button class="action-btn delete-btn" onclick="deleteRecovery(${index})" title="Delete">🗑️</button>`
            : "";

        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer ? customer.name : "-"}</td>
            <td>₹${Number(item.amount || 0).toLocaleString("en-IN")}</td>
            <td>${item.paymentMode || "-"}</td>
            <td>${item.receiptNo || "-"}</td>
            <td>${item.date || "-"}</td>
            <td>${item.collectedBy || "-"}</td>
            <td>${item.remarks || "-"}</td>
            <td>${deleteBtn}</td>
        </tr>
        `;

    });

}

function deleteRecovery(index) {

    const role = localStorage.getItem("currentRole") || "Admin";

    if (role !== "Admin") {
        alert("Only Admin Can Delete Records.");
        return;
    }

    if (!confirm("Delete this recovery entry?")) return;

    const item = recoveries[index];

    // Restore outstanding to customer
    if (item) {
        const customer = customers.find(c => c.id == item.customerId);
        if (customer) {
            customer.outstanding = Number(customer.outstanding || 0) + Number(item.amount || 0);
            localStorage.setItem("customers", JSON.stringify(customers));
        }
    }

    const removedId = item ? item.id : null;

    recoveries.splice(index, 1);
    localStorage.setItem("recoveries", JSON.stringify(recoveries));

    loadRecoveryTable();
    updateDashboard();
    updateRecoverySummary();
    if (typeof loadReports === "function") loadReports();

    if (removedId && typeof cloudDeleteRecovery === "function") {
        cloudDeleteRecovery(removedId);
    }
    if (typeof cloudSyncAll === "function") {
        cloudSyncAll();
    }

}

// ================================
// Customer Dropdown
// ================================

function loadRecoveryCustomers() {

    const select = document.getElementById("recoveryCustomer");

    if (!select) return;

    select.innerHTML =

        `<option value="">Select Customer</option>`;

    customers.forEach(customer => {

        select.innerHTML +=

        `<option value="${customer.id}">

            ${customer.name}

        </option>`;

    });

}

// ================================
// END OF PART 7
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 8 - REPORTS & FILTERS
// ==========================================================

// ================================
// Load Reports
// ================================

function loadReportCustomers() {

    const select = document.getElementById("reportCustomer");

    if (!select) return;

    const current = select.value;

    select.innerHTML = `<option value="">All Customers</option>`;

    customers.forEach(customer => {
        select.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
    });

    if (current) {
        select.value = current;
    }

}

function renderReportRows(list) {

    const tbody = document.getElementById("reportBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    list.forEach((item, index) => {

        const customer = customers.find(c => c.id == item.customerId);

        const status = customer && Number(customer.outstanding) > 0
            ? `<span class="badge badge-warning">Pending</span>`
            : `<span class="badge badge-success">Paid</span>`;

        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer ? customer.name : "-"}</td>
            <td>${customer ? (customer.mobile || "-") : "-"}</td>
            <td>${customer ? (customer.village || "-") : "-"}</td>
            <td>₹${Number(item.amount || 0).toLocaleString("en-IN")}</td>
            <td>${item.paymentMode || "-"}</td>
            <td>${item.date || "-"}</td>
            <td>${item.collectedBy || "-"}</td>
            <td>${status}</td>
        </tr>
        `;

    });

    // Update filtered stats if elements exist
    const totalRecords = document.getElementById("reportTotalRecords");
    const reportAmount = document.getElementById("reportAmount");

    if (totalRecords) {
        totalRecords.innerHTML = list.length;
    }

    if (reportAmount) {
        let sum = 0;
        list.forEach(i => sum += Number(i.amount || 0));
        reportAmount.innerHTML = formatCurrency(sum);
    }

}

function loadReports() {

    customers = JSON.parse(localStorage.getItem("customers")) || [];
    recoveries = JSON.parse(localStorage.getItem("recoveries")) || [];

    loadReportCustomers();
    renderReportRows(recoveries);
    updateRecoverySummary();
    updateReportExtraStats();

}

function getFilteredRecoveries() {

    customers = JSON.parse(localStorage.getItem("customers")) || [];
    recoveries = JSON.parse(localStorage.getItem("recoveries")) || [];

    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");
    const reportCustomer = document.getElementById("reportCustomer");
    const reportSearch = document.getElementById("reportSearch");

    let list = recoveries.slice();

    // Customer filter
    if (reportCustomer && reportCustomer.value) {
        list = list.filter(r => String(r.customerId) === String(reportCustomer.value));
    }

    // Date range
    if (fromDate && fromDate.value) {
        list = list.filter(r => r.date >= fromDate.value);
    }

    if (toDate && toDate.value) {
        list = list.filter(r => r.date <= toDate.value);
    }

    // Text search
    if (reportSearch && reportSearch.value.trim() !== "") {
        const keyword = reportSearch.value.trim().toLowerCase();
        list = list.filter(r => {
            const customer = customers.find(c => c.id == r.customerId);
            const name = customer ? (customer.name || "").toLowerCase() : "";
            const mobile = customer ? (customer.mobile || "").toLowerCase() : "";
            const village = customer ? (customer.village || "").toLowerCase() : "";
            return name.includes(keyword) || mobile.includes(keyword) || village.includes(keyword);
        });
    }

    return list;

}

function filterReport() {

    const list = getFilteredRecoveries();
    renderReportRows(list);
    updateReportExtraStats(list);

}

function searchReport() {

    filterReport();

}

function filterReportByDate() {

    filterReport();

}

function exportReport() {

    const list = getFilteredRecoveries();

    if (list.length === 0) {
        alert("No data to export.");
        return;
    }

    let csv = "No,Customer,Mobile,Village,Amount,Payment Mode,Date,Collected By,Remarks\n";

    list.forEach((item, index) => {
        const customer = customers.find(c => c.id == item.customerId);
        const name = customer ? (customer.name || "-") : "-";
        const mobile = customer ? (customer.mobile || "-") : "-";
        const village = customer ? (customer.village || "-") : "-";
        csv += `${index + 1},"${name}","${mobile}","${village}",${item.amount},"${item.paymentMode || "-"}","${item.date || "-"}","${item.collectedBy || "-"}","${(item.remarks || "").replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "VO-Recovery-Report.csv";
    a.click();
    URL.revokeObjectURL(url);

}

function updateReportExtraStats(list) {

    list = list || recoveries;

    // Top customer by recovery amount
    const totals = {};
    list.forEach(item => {
        const id = item.customerId;
        totals[id] = (totals[id] || 0) + Number(item.amount || 0);
    });

    let topId = null;
    let topAmt = 0;
    Object.keys(totals).forEach(id => {
        if (totals[id] > topAmt) {
            topAmt = totals[id];
            topId = id;
        }
    });

    const topCustomer = document.getElementById("topCustomer");
    const highestCollection = document.getElementById("highestCollection");
    const activeCustomers = document.getElementById("activeCustomers");
    const pendingCustomers = document.getElementById("pendingCustomers");

    if (topCustomer) {
        if (topId) {
            const c = customers.find(x => x.id == topId);
            topCustomer.innerHTML = c ? c.name : "-";
        } else {
            topCustomer.innerHTML = "-";
        }
    }

    if (highestCollection) {
        highestCollection.innerHTML = formatCurrency(topAmt);
    }

    if (activeCustomers) {
        const activeIds = new Set(list.map(r => String(r.customerId)));
        activeCustomers.innerHTML = activeIds.size;
    }

    if (pendingCustomers) {
        const pending = customers.filter(c => Number(c.outstanding || 0) > 0).length;
        pendingCustomers.innerHTML = pending;
    }

}

// ================================
// Monthly Collection
// ================================

function getMonthlyCollection() {

    const month = new Date().getMonth() + 1;

    const year = new Date().getFullYear();

    let total = 0;

    recoveries.forEach(item => {

        const d = new Date(item.date);

        if (

            d.getMonth() + 1 === month &&

            d.getFullYear() === year

        ) {

            total += Number(item.amount);

        }

    });

    return total;

}

// ================================
// Total Recovery
// ================================

function getTotalRecovery() {

    let total = 0;

    recoveries.forEach(item => {

        total += Number(item.amount);

    });

    return total;

}

// ================================
// Recovery Page Summary Cards
// ================================

function updateRecoverySummary(){

    customers = JSON.parse(localStorage.getItem("customers")) || [];
    recoveries = JSON.parse(localStorage.getItem("recoveries")) || [];

    const today = new Date().toISOString().split("T")[0];

    let todayTotal = 0;

    recoveries.forEach(item => {

        if(item.date === today){
            todayTotal += Number(item.amount || 0);
        }

    });

    let pendingTotal = 0;

    customers.forEach(customer => {

        pendingTotal += Number(customer.outstanding || 0);

    });

    const totalRecoveryAmount = getTotalRecovery();
    const monthlyAmount = getMonthlyCollection();
    const transactionCount = recoveries.length;

    const fields = {
        todayRecovery: formatCurrency(todayTotal),
        totalRecovery: formatCurrency(totalRecoveryAmount),
        pendingRecovery: formatCurrency(pendingTotal),
        totalTransactions: transactionCount,
        monthlyCollection: formatCurrency(monthlyAmount),
        summaryRecovery: formatCurrency(totalRecoveryAmount),
        summaryPending: formatCurrency(pendingTotal),
        summaryToday: formatCurrency(todayTotal),

        reportTotalCustomers: customers.length,
        reportTotalRecovery: formatCurrency(totalRecoveryAmount),
        reportMonthlyRecovery: formatCurrency(monthlyAmount),
        reportPending: formatCurrency(pendingTotal),
        reportTotalRecords: transactionCount,
        reportAmount: formatCurrency(totalRecoveryAmount),
        reportPendingBalance: formatCurrency(pendingTotal),
        todayCollection: formatCurrency(todayTotal),
        thisMonthCollection: formatCurrency(monthlyAmount),
        reportOutstanding: formatCurrency(pendingTotal)
    };

    Object.keys(fields).forEach(id => {

        const el = document.getElementById(id);

        if(el){
            el.innerHTML = fields[id];
        }

    });

}

// ================================
// Customer Wise Recovery
// ================================

function getCustomerRecovery(customerId) {

    let total = 0;

    recoveries.forEach(item => {

        if (item.customerId == customerId) {

            total += Number(item.amount);

        }

    });

    return total;

}

// ================================
// END OF PART 8
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 9 - UTILITY FUNCTIONS
// ==========================================================

// ================================
// Format Currency
// ================================

function formatCurrency(amount){

    amount = Number(amount || 0);

    return "₹" + amount.toLocaleString("en-IN");

}

// ================================
// Format Date
// ================================

function formatDate(date){

    if(!date) return "-";

    const d = new Date(date);

    return d.toLocaleDateString("en-IN");

}

// ================================
// Backup Data
// ================================

function backupData(){

    // Local JSON download
    const backup = {
        customers: customers,
        recoveries: recoveries,
        settings: settings,
        users: (typeof getUsers === "function") ? getUsers() : [],
        backupDate: new Date().toISOString()
    };

    const data = JSON.stringify(backup, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "VO-Recovery-Backup.json";
    a.click();
    URL.revokeObjectURL(url);

    // Also full backup to Firebase Console
    if (typeof fullBackupToFirebase === "function") {
        fullBackupToFirebase();
    } else {
        alert("Local JSON backup downloaded.");
    }

}

function firebaseFullBackup() {
    if (typeof fullBackupToFirebase === "function") {
        fullBackupToFirebase();
    } else {
        alert("Firebase module not loaded.");
    }
}

function firebaseFullRestore() {
    if (typeof restoreFromFirebaseLatest === "function") {
        restoreFromFirebaseLatest();
    } else {
        alert("Firebase module not loaded.");
    }
}

// ================================
// Restore Data
// ================================

function restoreData(event){

    const input = event && event.target ? event.target : document.getElementById("restoreFile");
    const file = input && input.files ? input.files[0] : null;

    if(!file) {
        alert("Please select a backup JSON file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e){

        try {
            const backup = JSON.parse(e.target.result);

            customers = backup.customers || [];
            recoveries = backup.recoveries || [];
            settings = backup.settings || {};

            localStorage.setItem("customers", JSON.stringify(customers));
            localStorage.setItem("recoveries", JSON.stringify(recoveries));
            localStorage.setItem("settings", JSON.stringify(settings));

            if (backup.users && backup.users.length) {
                localStorage.setItem("users", JSON.stringify(backup.users));
            }

            if (typeof loadCustomers === "function") loadCustomers();
            if (typeof loadRecoveryTable === "function") loadRecoveryTable();
            if (typeof loadReports === "function") loadReports();
            if (typeof updateDashboard === "function") updateDashboard();
            if (typeof updateRecoverySummary === "function") updateRecoverySummary();

            // Push restored data to Firebase as well
            if (typeof fullBackupToFirebase === "function") {
                fullBackupToFirebase();
            }

            alert("Backup Restored Successfully.");
        } catch (err) {
            alert("Invalid backup file.");
            console.error(err);
        }

    };

    reader.readAsText(file);

}

// ================================
// Clear All Data
// ================================

function clearAllData(){

    if(confirm("Delete ALL Data Permanently?\n\nLocal data clear થશે. Firebase cloud data અલગથી manage કરો.")){

        localStorage.removeItem("customers");
        localStorage.removeItem("recoveries");
        localStorage.removeItem("settings");

        customers = [];
        recoveries = [];
        settings = {};

        if (typeof loadCustomers === "function") loadCustomers();
        if (typeof loadRecoveryTable === "function") loadRecoveryTable();
        if (typeof loadReports === "function") loadReports();
        if (typeof updateDashboard === "function") updateDashboard();
        if (typeof updateRecoverySummary === "function") updateRecoverySummary();

        alert("All Local Data Cleared.");

    }

}

// ================================
// Change Admin Credentials (Settings Page)
// ================================

function saveSettings(){

    const usernameField = document.getElementById("adminUsername");
    const currentPasswordField = document.getElementById("currentPassword");
    const newPasswordField = document.getElementById("newPassword");
    const confirmPasswordField = document.getElementById("confirmPassword");
    const recoveryEmailField = document.getElementById("recoveryEmail");

    if(!usernameField){
        return;
    }

    const users = getUsers();
    const currentUsername = localStorage.getItem("currentUser");

    const userIndex = users.findIndex(u => u.username === currentUsername);

    if(userIndex === -1){
        alert("Could Not Find Your Account. Please Login Again.");
        return;
    }

    const account = users[userIndex];

    const newUsername = usernameField.value.trim();

    if(newUsername === ""){
        alert("Username Cannot Be Empty");
        return;
    }

    const currentPassword = currentPasswordField ? currentPasswordField.value.trim() : "";
    const newPassword = newPasswordField ? newPasswordField.value.trim() : "";
    const confirmPassword = confirmPasswordField ? confirmPasswordField.value.trim() : "";

    if(newPassword !== "" || confirmPassword !== ""){

        if(currentPassword !== account.password){
            alert("Current Password Is Incorrect");
            return;
        }

        if(newPassword.length < 4){
            alert("New Password Must Be At Least 4 Characters");
            return;
        }

        if(newPassword !== confirmPassword){
            alert("New Password And Confirm Password Do Not Match");
            return;
        }

        account.password = newPassword;

    }

    // Prevent Duplicate Username With Another Account

    const duplicate = users.find((u, i) => i !== userIndex && u.username === newUsername);

    if(duplicate){
        alert("This Username Is Already Taken By Another User.");
        return;
    }

    account.username = newUsername;

    users[userIndex] = account;

    saveUsers(users);

    localStorage.setItem("currentUser", newUsername);

    if(recoveryEmailField){

        settings.recoveryEmail = recoveryEmailField.value.trim();

        localStorage.setItem("settings", JSON.stringify(settings));

    }

    if(currentPasswordField) currentPasswordField.value = "";
    if(newPasswordField) newPasswordField.value = "";
    if(confirmPasswordField) confirmPasswordField.value = "";

    if (typeof cloudSyncAll === "function") {
        cloudSyncAll();
    }

    alert("Settings Saved Successfully.");

    loadUserList();

}

// ================================
// User Management (Admin Only)
// ================================

function addUser(){

    const usernameField = document.getElementById("newUserUsername");
    const passwordField = document.getElementById("newUserPassword");
    const roleField = document.getElementById("newUserRole");

    if(!usernameField || !passwordField || !roleField){
        return;
    }

    const username = usernameField.value.trim();
    const password = passwordField.value.trim();
    const role = roleField.value;

    if(username === ""){
        alert("Please Enter Username");
        return;
    }

    if(password.length < 4){
        alert("Password Must Be At Least 4 Characters");
        return;
    }

    const users = getUsers();

    if(users.find(u => u.username === username)){
        alert("This Username Already Exists");
        return;
    }

    users.push({ username: username, password: password, role: role });

    saveUsers(users);

    usernameField.value = "";
    passwordField.value = "";
    roleField.value = "User";

    alert("User Added Successfully.");

    loadUserList();

}

function deleteUser(username){

    const currentUsername = localStorage.getItem("currentUser");

    if(username === currentUsername){
        alert("You Cannot Delete Your Own Logged-In Account.");
        return;
    }

    let users = getUsers();

    const target = users.find(u => u.username === username);

    if(target && target.role === "Admin"){

        const adminCount = users.filter(u => u.role === "Admin").length;

        if(adminCount <= 1){
            alert("Cannot Delete The Only Admin Account.");
            return;
        }

    }

    if(!confirm("Remove This User Permanently?")){
        return;
    }

    users = users.filter(u => u.username !== username);

    saveUsers(users);

    loadUserList();

}

function loadUserList(){

    const tbody = document.getElementById("userListBody");

    if(!tbody){
        return;
    }

    const users = getUsers();

    tbody.innerHTML = "";

    users.forEach(u => {

        tbody.innerHTML += `

        <tr>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>
                <button onclick="deleteUser('${u.username}')" title="Remove">🗑️ Remove</button>
            </td>
        </tr>

        `;

    });

}

// ================================
// Company Name
// ================================

function getCompanyName(){

    return settings.company ||

    "Vrundavan Ornaments Pvt. Ltd.";

}

// ================================
// END OF PART 9
// ================================// ==========================================================
// VO RECOVERY MANAGER
// script.js
// PART 10 - FINAL INITIALIZATION
// ==========================================================

// ================================
// Auto Initialize Project
// ================================

window.addEventListener("load", async function () {

    // Firebase boot (pull cloud data if configured)
    if (typeof firebaseBoot === "function") {
        try {
            await firebaseBoot();
        } catch (e) {
            console.error(e);
        }
    }

    // Login Check
    checkLogin();

    // Reload Local Storage (may already be updated by Firebase pull)
    customers = JSON.parse(
        localStorage.getItem("customers")
    ) || [];

    recoveries = JSON.parse(
        localStorage.getItem("recoveries")
    ) || [];

    settings = JSON.parse(
        localStorage.getItem("settings")
    ) || {};

    // Customers Page
    if (document.getElementById("customerBody")) {

        loadCustomers();

    }

    // Dashboard
    if (document.getElementById("totalCustomers")) {

        updateDashboard();

        loadRecentCustomers();

        loadDashboardFollowups();

        loadDashboardRecentRecovery();

    }

    // Recovery Page
    if (document.getElementById("recoveryBody")) {

        loadRecoveryTable();

        updateRecoverySummary();

    }

    // Recovery Customer Dropdown
    if (document.getElementById("recoveryCustomer")) {

        loadRecoveryCustomers();

    }

    // Reports
if (document.getElementById("reportBody")) {

    loadReports();

}

    // Settings Page - Prefill Current Credentials
    if (document.getElementById("adminUsername")) {

        const currentUsername = localStorage.getItem("currentUser");
        const users = getUsers();
        const account = users.find(u => u.username === currentUsername) || users[0];

        if (account) {
            document.getElementById("adminUsername").value = account.username;
        }

        if (document.getElementById("recoveryEmail") && settings.recoveryEmail) {
            document.getElementById("recoveryEmail").value = settings.recoveryEmail;
        }

        loadUserList();

    }

    // Prefill company branding fields
    if (document.getElementById("companyName") && settings.company) {
        document.getElementById("companyName").value = settings.company;
    }
    if (document.getElementById("logoPreview") && settings.logoDataUrl) {
        document.getElementById("logoPreview").src = settings.logoDataUrl;
        document.getElementById("logoPreview").style.display = "block";
    }


});

// ================================
// Refresh Complete Project
// ================================

function refreshProject() {

    customers = JSON.parse(
        localStorage.getItem("customers")
    ) || [];

    recoveries = JSON.parse(
        localStorage.getItem("recoveries")
    ) || [];

    settings = JSON.parse(
        localStorage.getItem("settings")
    ) || {};

    if (typeof loadCustomers === "function") {

        loadCustomers();

    }

    if (typeof loadRecoveryTable === "function") {

        loadRecoveryTable();

    }

    if (typeof loadReports === "function") {

        loadReports();

    }

    if (typeof updateDashboard === "function") {

        updateDashboard();

    }

}

// ================================
// App Version
// ================================



// ================================
// Company Branding (Multi-Jeweller)
// ================================

function previewCompanyLogo(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById("logoPreview");
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = "block";
        }
        settings = JSON.parse(localStorage.getItem("settings")) || {};
        settings.logoDataUrl = e.target.result;
        localStorage.setItem("settings", JSON.stringify(settings));
        if (typeof cloudSyncAll === "function") cloudSyncAll();
    };
    reader.readAsDataURL(file);
}

function saveCompanyBranding() {
    settings = JSON.parse(localStorage.getItem("settings")) || {};
    const companyField = document.getElementById("companyName");
    const phoneField = document.getElementById("companyMobile") || document.getElementById("contactNumber");
    const emailField = document.getElementById("companyEmail") || document.getElementById("emailAddress");
    const addressField = document.getElementById("companyAddress");
    const softwareField = document.getElementById("softwareName");

    if (companyField && companyField.value.trim()) {
        settings.company = companyField.value.trim();
    }
    if (phoneField && phoneField.value.trim()) {
        settings.phone = phoneField.value.trim();
    }
    if (emailField && emailField.value.trim()) {
        settings.email = emailField.value.trim();
    }
    if (addressField && addressField.value.trim()) {
        settings.address = addressField.value.trim();
    }
    if (softwareField && softwareField.value.trim()) {
        settings.softwareName = softwareField.value.trim();
    }

    localStorage.setItem("settings", JSON.stringify(settings));
    if (typeof cloudSyncAll === "function") cloudSyncAll();
    alert("Company branding saved. Login page પર logo/name દેખાશે.");
}

window.previewCompanyLogo = previewCompanyLogo;
window.saveCompanyBranding = saveCompanyBranding;


const APP_INFO = {

    name: "VO Recovery Manager",

    version: "1.0.0",

    company: "Vrundavan Ornaments Pvt. Ltd.",

    developer: "BK Design Hub"

};

console.log(

    APP_INFO.name +
    " v" +
    APP_INFO.version

);

// ==========================================================
// END OF SCRIPT.JS
// ==========================================================