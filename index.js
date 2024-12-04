import inquirer from 'inquirer';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

// Create a connection to the PostgreSQL database
const db = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, // Replace with your PostgreSQL username
    password: process.env.DB_PASSWORD, // Replace with your PostgreSQL password
    database: process.env.DB_NAME // Replace with your PostgreSQL database name
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        process.exit(1);
    }
    console.log('Connected to the PostgreSQL database.');
    init();
});

// Initialize the application
function init() {
    inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            'View all departments',
            'View all roles',
            'View all employees',
            'Add a department',
            'Add a role',
            'Add an employee',
            'Update an employee role',
            'Exit'
        ]
    }).then(answer => {
        switch (answer.action) {
            case 'View all departments':
                viewDepartments();
                break;
            case 'View all roles':
                viewRoles();
                break;
            case 'View all employees':
                viewEmployees();
                break;
            case 'Add a department':
                addDepartment();
                break;
            case 'Add a role':
                addRole();
                break;
            case 'Add an employee':
                addEmployee();
                break;
            case 'Update an employee role':
                updateEmployeeRole();
                break;
            default:
                db.end();
        }
    });
}

// View all departments
function viewDepartments() {
    db.query('SELECT * FROM department', (err, res) => {
        if (err) throw err;
        console.table(res.rows);
        init();
    });
}

// View all roles
function viewRoles() {
    db.query(`
        SELECT role.id, role.title, role.salary, department.name AS department
        FROM role
        JOIN department ON role.department_id = department.id
    `, (err, res) => {
        if (err) throw err;
        console.table(res.rows);
        init();
    });
}

// View all employees
function viewEmployees() {
    db.query(`
        SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name AS department, role.salary,
        CONCAT(manager.first_name, ' ', manager.last_name) AS manager
        FROM employee
        JOIN role ON employee.role_id = role.id
        JOIN department ON role.department_id = department.id
        LEFT JOIN employee AS manager ON employee.manager_id = manager.id
    `, (err, res) => {
        if (err) throw err;
        console.table(res.rows);
        init();
    });
}

// Add a department
function addDepartment() {
    inquirer.prompt({
        name: 'name',
        type: 'input',
        message: 'Enter the name of the department:'
    }).then(answer => {
        db.query('INSERT INTO department (name) VALUES ($1)', [answer.name], (err, res) => {
            if (err) throw err;
            console.log('Department added successfully.');
            init();
        });
    });
}

// Add a role
function addRole() {
    db.query('SELECT * FROM department', (err, res) => {
        if (err) throw err;
        inquirer.prompt([
            {
                name: 'title',
                type: 'input',
                message: 'Enter the name of the role:'
            },
            {
                name: 'salary',
                type: 'input',
                message: 'Enter the salary for the role:'
            },
            {
                name: 'department',
                type: 'list',
                message: 'Select the department for the role:',
                choices: res.rows.map(department => ({
                    name: department.name,
                    value: department.id
                }))
            }
        ]).then(answer => {
            db.query('INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)', [answer.title, answer.salary, answer.department], (err, res) => {
                if (err) throw err;
                console.log('Role added successfully.');
                init();
            });
        });
    });
}

// Add an employee
function addEmployee() {
    db.query('SELECT * FROM role', (err, roles) => {
        if (err) throw err;
        db.query('SELECT * FROM employee', (err, employees) => {
            if (err) throw err;
            inquirer.prompt([
                {
                    name: 'first_name',
                    type: 'input',
                    message: 'Enter the first name of the employee:'
                },
                {
                    name: 'last_name',
                    type: 'input',
                    message: 'Enter the last name of the employee:'
                },
                {
                    name: 'role',
                    type: 'list',
                    message: 'Select the role for the employee:',
                    choices: roles.rows.map(role => ({
                        name: role.title,
                        value: role.id
                    }))
                },
                {
                    name: 'manager',
                    type: 'list',
                    message: 'Select the manager for the employee:',
                    choices: [
                        { name: 'None', value: null },
                        ...employees.rows.map(employee => ({
                            name: `${employee.first_name} ${employee.last_name}`,
                            value: employee.id
                        }))
                    ]
                }
            ]).then(answer => {
                db.query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)', [answer.first_name, answer.last_name, answer.role, answer.manager], (err, res) => {
                    if (err) throw err;
                    console.log('Employee added successfully.');
                    init();
                });
            });
        });
    });
}

// Update an employee role
function updateEmployeeRole() {
    db.query('SELECT * FROM employee', (err, employees) => {
        if (err) throw err;
        db.query('SELECT * FROM role', (err, roles) => {
            if (err) throw err;
            inquirer.prompt([
                {
                    name: 'employee',
                    type: 'list',
                    message: 'Select the employee to update:',
                    choices: employees.rows.map(employee => ({
                        name: `${employee.first_name} ${employee.last_name}`,
                        value: employee.id
                    }))
                },
                {
                    name: 'role',
                    type: 'list',
                    message: 'Select the new role for the employee:',
                    choices: roles.rows.map(role => ({
                        name: role.title,
                        value: role.id
                    }))
                }
            ]).then(answer => {
                db.query('UPDATE employee SET role_id = $1 WHERE id = $2', [answer.role, answer.employee], (err, res) => {
                    if (err) throw err;
                    console.log('Employee role updated successfully.');
                    init();
                });
            });
        });
    });
}
