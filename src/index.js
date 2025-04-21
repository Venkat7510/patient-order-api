// src/index.js
const express = require('express');
require('dotenv').config();
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

function toMysqlDateTime(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        + ` ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const authenticatePost = (req, res, next) => {
    if (req.method !== 'POST') return next();           // only guard POST
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token || token !== process.env.API_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
app.use(authenticatePost);

// MySQL pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Plmoknijb1357@',
    database: process.env.DB_NAME || 'RegistrationDetails',
    waitForConnections: true,
    connectionLimit: 10
});

// POST /orders

app.get('/health' , async (req,res) => {
    res.json("Running")
})

// Sign up
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const conn = await pool.getConnection();
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'User creation failed' });
    } finally {
        conn.release();
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const conn = await pool.getConnection();
    try {
        const [[user]] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        conn.release();
    }
});

app.post('/orders', async (req, res) => {
    const { PatientInfo, Orders } = req.body;
    if (!PatientInfo?.PatientID) {
        return res.status(400).json({ error: 'Missing PatientInfo.PatientID' });
    }
    if (!Array.isArray(Orders) || Orders.length === 0) {
        return res.status(400).json({ error: 'Orders must be a non-empty array' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1) Upsert patient
        await conn.execute(
            `INSERT INTO patients
         (patient_id, patient_number, salutation_code, first_name,
          middle_name, last_name, gender, age, dob, mobile_number)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         patient_number=VALUES(patient_number),
         salutation_code=VALUES(salutation_code),
         first_name=VALUES(first_name),
         middle_name=VALUES(middle_name),
         last_name=VALUES(last_name),
         gender=VALUES(gender),
         age=VALUES(age),
         dob=VALUES(dob),
         mobile_number=VALUES(mobile_number)`,
            [
                PatientInfo.PatientID,
                PatientInfo.PatientNumber,
                PatientInfo.SalutationCode,
                PatientInfo.FirstName,
                PatientInfo.MiddleName,
                PatientInfo.LastName,
                PatientInfo.Gender,
                PatientInfo.Age,
                PatientInfo.DOB,
                PatientInfo.MobileNumber
            ]
        );

        // 2) Replace addresses
        await conn.execute(
            `DELETE FROM addresses WHERE patient_id = ?`,
            [PatientInfo.PatientID]
        );
        for (const addr of PatientInfo.AddressDetails || []) {
            await conn.execute(
                `INSERT INTO addresses
           (patient_id, address, address_type, suburb, city,
            state, country, state_id, country_id, external_patient_number)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [
                    PatientInfo.PatientID,
                    addr.Address,
                    addr.AddressType,
                    addr.Suburb,
                    addr.City,
                    addr.State,
                    addr.Country,
                    addr.StateID,
                    addr.CountryID,
                    addr.ExternalPatientNumber
                ]
            );
        }

        // 3) Insert orders & tests
        for (const o of Orders) {
            const visitDate = toMysqlDateTime(o.PatientVisitInfo.VisitDate);

            await conn.execute(
                `INSERT INTO orders
                 (order_id, patient_id, org_code, overall_status, payment_status,
                  visit_id, visit_type, visit_date, client_code,
                  refering_doc_code, refering_doc_name, register_location)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE
                 overall_status=VALUES(overall_status),
                 payment_status=VALUES(payment_status)`,
                [
                    o.OrderId,
                    PatientInfo.PatientID,
                    o.OrgCode,
                    o.OverAllStatus,
                    o.PaymentStatus,
                    o.PatientVisitInfo.PatientVisitId,
                    o.PatientVisitInfo.VisitType,
                    visitDate,
                    o.PatientVisitInfo.ClientCode,
                    o.PatientVisitInfo.ReferingDoctorCode,
                    o.PatientVisitInfo.ReferingDoctorName,
                    o.PatientVisitInfo.RegisterLocation
                ]
            );

            // tests
            for (const t of o.OrderInfo) {
                const resultAt = toMysqlDateTime(t.ResultCapturedAt);
                await conn.execute(
                    `INSERT INTO order_tests
                   (order_id, test_id, test_code, test_name, test_value,
                    uom_code, reference_range, is_abnormal, result_captured_at,
                    test_status, department_name, device_id, barcode_number)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        o.OrderId,
                        t.TestID,
                        t.TestCode,
                        t.TestName,
                        t.TestValue,
                        t.UOMCode,
                        (t.ReferenceRange || '').trim(),
                        t.IsAbnormal,
                        resultAt,
                        t.TestStatus,
                        t.DepartmentName,
                        t.DeviceID,
                        t.BarcodeNumber
                    ]
                );
            }
        }
        await conn.commit();
        res.json({ message: 'Orders and addresses saved successfully' });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

// GET /orders/:patientId
app.get('/orders/:patientId', async (req, res) => {
    const pid = req.params.patientId;
    const conn = await pool.getConnection();
    try {
        // fetch patient
        const [[patientRow]] = await conn.execute(
            `SELECT * FROM patients WHERE patient_id = ?`,
            [pid]
        );
        if (!patientRow) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // fetch addresses
        const [addrRows] = await conn.execute(
            `SELECT address AS Address,
              address_type AS AddressType,
              suburb AS Suburb,
              city AS City,
              state AS State,
              country AS Country,
              state_id AS StateID,
              country_id AS CountryID,
              external_patient_number AS ExternalPatientNumber
       FROM addresses
       WHERE patient_id = ?`,
            [pid]
        );

        // fetch orders & visits
        const [orderRows] = await conn.execute(
            `SELECT DISTINCT
         order_id,
         visit_id        AS PatientVisitId,
         visit_type      AS VisitType,
         visit_date      AS VisitDate,
         client_code     AS ClientCode,
         refering_doc_code  AS ReferingDoctorCode,
         refering_doc_name  AS ReferingDoctorName,
         register_location  AS RegisterLocation
       FROM orders
       WHERE patient_id = ?`,
            [pid]
        );

        res.json({
            PatientInfo: {
                PatientID: patientRow.patient_id,
                PatientNumber: patientRow.patient_number,
                SalutationCode: patientRow.salutation_code,
                FirstName: patientRow.first_name,
                MiddleName: patientRow.middle_name,
                LastName: patientRow.last_name,
                Gender: patientRow.gender,
                Age: patientRow.age,
                DOB: patientRow.dob,
                MobileNumber: patientRow.mobile_number,
                AddressDetails: addrRows
            },
            Visits: orderRows
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    } finally {
        conn.release();
    }
});

// start
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on port ${port}`);
});
