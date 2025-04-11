$(document).ready(function () {
    loadUserSummary(); // Load user summary data when the page is ready
    initThemeManager();
});

function initThemeManager() {
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
    }
}
function loadUserSummary() {
    $.ajax({
        url: '/api/admin/users', // Same endpoint to get all users
        type: 'GET',
        dataType: 'json',
        success: function (usuarios) {
            updateUserSummaryTable(usuarios);
        },
        error: function () {
            showAlert('#errorAlert', 'Error al cargar el resumen de usuarios.');
        }
    });
}

function updateUserSummaryTable(usuarios) {
    const totalUsers = usuarios.length;
    let adminUsersCount = 0;
    let standardUsersCount = 0;

    $.each(usuarios, function (index, usuario) {
        if (usuario.rol === 'ROLE_ADMIN') {
            adminUsersCount++;
        } else if (usuario.rol === 'ROLE_USER') { // Assuming 'ROLE_USER' is the standard role
            standardUsersCount++;
        }
    });

    $('#totalUsers').text(totalUsers);
    $('#adminUsers').text(adminUsersCount);
    $('#standardUsers').text(standardUsersCount);
}

function showAlert(selector, message) {
    if (message) {
        $(selector).text(message);
    }
    $(selector).fadeIn().delay(3000).fadeOut();
}
