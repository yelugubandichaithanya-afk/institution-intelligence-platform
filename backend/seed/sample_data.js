/*
 * SAMPLE DATA — all institutions, people, trusts, universities and companies
 * below are fictional. Structure mirrors the future Supabase schema.
 *
 * Every number is an "evidence" object: { v, src, date, st }
 *   v    = value
 *   src  = source (AISHE, University Portal, College Website, ...)
 *   date = date the value was captured / verified (YYYY-MM-DD)
 *   st   = verification status: verified | govt | self | unverified | internal
 */
(function () {
  const E = (v, src, date, st) => ({ v, src, date, st });

  // Admission rows: [academicYear, approvedIntake, collegeClaimed, universityVerified]
  function admissions(rows, intakeSrc, verSrc) {
    return rows.map(([year, intake, claimed, verified], i) => {
      const y = parseInt(year, 10);
      const last = i === rows.length - 1;
      return {
        year,
        intake: E(intake, intakeSrc, `${y}-05-30`, 'govt'),
        claimed: E(claimed, 'College Website / Prospectus', `${y}-10-15`, 'self'),
        verified: verified == null ? null
          : E(verified, verSrc, last ? '2026-09-23' : `${y + 1}-02-20`, 'verified'),
      };
    });
  }

  // Placement rows: [batchYear, eligible, placedVerified, claimedPct, highestL, averageL, medianL]
  function placements(rows, verSrc) {
    return rows.map(([year, eligible, placed, claimedPct, high, avg, median]) => {
      const st = placed == null ? 'self' : 'verified';
      const src = placed == null ? 'College Placement Report' : verSrc;
      const date = `${year}-09-30`;
      return {
        year,
        eligible: E(eligible, src, date, st),
        placed: placed == null ? null : E(placed, src, date, st),
        claimedPct: E(claimedPct, 'College Website', `${year}-08-01`, 'self'),
        highest: E(high, src, date, st),
        average: E(avg, src, date, st),
        median: E(median, src, date, st),
      };
    });
  }

  // NIRF rows: { category: [[year, rank|null], ...] }
  function nirf(map) {
    const out = {};
    for (const [cat, rows] of Object.entries(map)) {
      out[cat] = rows.map(([year, rank]) => ({
        year, rank: E(rank, 'NIRF', `${year}-08-13`, 'govt'),
      }));
    }
    return out;
  }

  const institutions = [
    // ------------------------------------------------------------------
    {
      id: 'dvit',
      name: 'Deccan Valley Institute of Technology',
      shortName: 'DVIT',
      aishe: 'C-90231',
      city: 'Hyderabad',
      state: 'Telangana',
      established: 2004,
      ownership: 'Private Trust',
      category: 'Engineering',
      university: 'Krishna Godavari Technological University',
      campusStatus: 'Operational',
      website: 'www.dvit-sample.edu.in',

      regulatory: [
        { body: 'UGC', item: 'Recognition u/s 2(f)', value: E('Recognised', 'UGC HEI List', '2026-07-10', 'govt'), state: 'ok' },
        { body: 'AICTE', item: 'Extension of Approval 2026-27', value: E('Approved', 'AICTE Portal', '2026-06-02', 'govt'), state: 'ok' },
        { body: 'University', item: 'Affiliation', value: E('Affiliated (permanent)', 'University Portal', '2026-08-14', 'verified'), state: 'ok', affiliation: true },
        { body: 'NAAC', item: 'Accreditation', value: E('B++ (CGPA 2.86)', 'NAAC Portal', '2022-03-18', 'govt'), validUntil: '2027-03-17', state: 'ok', naac: true },
        { body: 'NBA', item: 'CSE, ECE', value: E('Accredited', 'NBA Portal', '2023-06-20', 'govt'), validUntil: '2026-06-30', state: 'expired' },
        { body: 'Autonomy', item: 'Autonomous status', value: E('Not autonomous', 'UGC Autonomous Colleges List', '2026-07-10', 'govt'), state: 'na' },
      ],

      admissions: admissions([
        ['2021-22', 1080, 640, 540],
        ['2022-23', 1080, 700, 610],
        ['2023-24', 1080, 790, 690],
        ['2024-25', 1200, 880, 760],
        ['2025-26', 1200, 950, 820],
      ], 'AICTE Approval Process', 'University Portal'),

      courses: [
        { name: 'B.Tech CSE', level: 'UG', duration: 4, intake: 360, admitted: 340, status: 'active' },
        { name: 'B.Tech CSE (AI & ML)', level: 'UG', duration: 4, intake: 180, admitted: 165, status: 'new', since: '2023-24' },
        { name: 'B.Tech CSE (Data Science)', level: 'UG', duration: 4, intake: 60, admitted: 58, status: 'new', since: '2024-25' },
        { name: 'B.Tech ECE', level: 'UG', duration: 4, intake: 180, admitted: 96, status: 'active' },
        { name: 'B.Tech EEE', level: 'UG', duration: 4, intake: 120, admitted: 38, status: 'active' },
        { name: 'B.Tech Mechanical', level: 'UG', duration: 4, intake: 120, admitted: 25, status: 'active' },
        { name: 'B.Tech IT', level: 'UG', duration: 4, intake: 120, admitted: 80, status: 'active' },
        { name: 'MBA', level: 'PG', duration: 2, intake: 60, admitted: 18, status: 'active' },
        { name: 'B.Tech Civil', level: 'UG', duration: 4, intake: 0, admitted: 0, status: 'discontinued', since: '2024-25' },
      ],
      coursesSource: E('Course-wise 2025-26', 'University Portal', '2026-09-23', 'verified'),

      placements: placements([
        [2021, 330, 205, 85, 12, 4.1, 3.6],
        [2022, 350, 231, 88, 14, 4.4, 3.9],
        [2023, 365, 241, 90, 15, 4.5, 4.0],
        [2024, 380, 260, 92, 16, 4.8, 4.2],
        [2025, 400, 292, 92, 18, 5.2, 4.6],
      ], 'NIRF Data Submission'),

      recruiters: {
        total: E(86, 'College Placement Report', '2025-09-30', 'self'),
        repeat: E(54, 'College Placement Report', '2025-09-30', 'self'),
        newCount: E(32, 'College Placement Report', '2025-09-30', 'self'),
        international: E(2, 'College Placement Report', '2025-09-30', 'self'),
        top: ['Nimbus Tech Services', 'Orbit Infosystems', 'Kaveri Bank', 'Peakline Consulting', 'Bluegrid Software', 'Sahyadri Motors', 'Tanvi Analytics', 'Indus Ledger Finance'],
        internships: ['Bluegrid Software', 'Tanvi Analytics', 'Hexa Robotics Labs', 'Kaveri Bank'],
        sectors: { 'IT': 58, 'BFSI': 17, 'Core': 11, 'Services': 14 },
        locations: { 'Hyderabad': 48, 'Bengaluru': 27, 'Chennai': 9, 'Pune': 8, 'Others': 8 },
      },

      nirf: nirf({
        'Engineering': [[2022, null], [2023, null], [2024, null], [2025, '201-300'], [2026, '151-200']],
        'Overall': [[2022, null], [2023, null], [2024, null], [2025, null], [2026, null]],
      }),

      promoter: {
        trust: 'Deccan Valley Educational Trust',
        entityType: 'Registered Public Trust',
        trustEstablished: 1998,
        registration: E('Reg. No. 412/1998', 'Registrar of Trusts', '2026-08-01', 'verified'),
        promoters: [
          { name: 'K. Raghava Rao', role: 'Founder & Chairman' },
          { name: 'S. Lakshmi Prasanna', role: 'Secretary & Correspondent' },
        ],
        board: ['K. Raghava Rao', 'S. Lakshmi Prasanna', 'Dr. M. Venkat Reddy', 'P. Anitha Kumari', 'R. Srinivas Goud'],
        keyManagement: [
          { name: 'Dr. A. Sudhakar', role: 'Principal' },
          { name: 'V. Harish Kumar', role: 'Director, Training & Placement' },
          { name: 'N. Kavitha', role: 'Finance Controller' },
        ],
        otherInstitutions: ['Deccan Valley Polytechnic (2008)', 'DV Junior College (2001)'],
        otherBusinesses: ['DV Infra Developers Pvt Ltd — real estate (Director: K. Raghava Rao)'],
        previousInstitutions: [],
        insolvency: E('No records found', 'IBBI Public Records', '2026-09-10', 'verified'),
        legal: [
          { type: 'civil_dispute', party: 'Trust', title: 'Land boundary suit over 1.2 acres of campus land', forum: 'City Civil Court, Hyderabad', year: 2019, status: 'Pending', material: false, src: 'eCourts', date: '2026-09-10' },
          { type: 'complaint', party: 'Institution', title: 'Fee refund complaint by parents (6 students)', forum: 'State Fee Regulatory Committee', year: 2024, status: 'Disposed — refund ordered', material: false, src: 'Committee Order', date: '2024-12-05' },
        ],
      },

      campus: {
        students: E(3120, 'AISHE', '2026-03-31', 'govt'),
        faculty: E(178, 'AICTE Faculty Portal', '2026-06-02', 'govt'),
        facultyAttrition: E(14, 'Management Discussion', '2026-09-18', 'internal'),
        attendance: E(78, 'College MIS', '2026-09-18', 'self'),
        passPct: E(71, 'University Results Portal', '2026-07-30', 'verified'),
        backlogs: E(18, 'University Results Portal', '2026-07-30', 'verified'),
        dropouts: E(6.2, 'AISHE', '2026-03-31', 'govt'),
        graduationRate: E(82, 'AISHE', '2026-03-31', 'govt'),
        higherStudies: E(9, 'NIRF Data Submission', '2025-12-15', 'govt'),
        land: E(22, 'AICTE Mandatory Disclosure', '2026-06-02', 'self'),
        builtUp: E(410000, 'AICTE Mandatory Disclosure', '2026-06-02', 'self'),
        classrooms: E(72, 'AICTE Mandatory Disclosure', '2026-06-02', 'self'),
        labs: E(48, 'AICTE Mandatory Disclosure', '2026-06-02', 'self'),
        library: E(52000, 'AISHE', '2026-03-31', 'govt'),
        hostelCapacity: E(900, 'Campus Visit', '2026-09-18', 'internal'),
        hostelOccupancy: E(872, 'Campus Visit', '2026-09-18', 'internal'),
        buses: E(28, 'Campus Visit', '2026-09-18', 'internal'),
        sports: 'Cricket ground, 2 basketball courts, indoor games block',
      },

      commercial: {
        capacity: E(4680, 'AICTE Approval Process', '2026-06-02', 'govt'),
        avgFee: E(1.35, 'State Fee Regulatory Committee', '2025-07-01', 'govt'),
        collectionEfficiency: E(88, 'Management Discussion', '2026-09-18', 'internal'),
        outstanding: E(4.2, 'Management Discussion', '2026-09-18', 'internal'), // ₹ Cr
        scholarshipPct: E(38, 'Management Discussion', '2026-09-18', 'internal'),
        discountPct: E(6, 'Management Discussion', '2026-09-18', 'internal'),
        refunds: E(0.45, 'Management Discussion', '2026-09-18', 'internal'), // ₹ Cr
        courseFees: [
          { course: 'B.Tech (all branches)', fee: 1.35 },
          { course: 'MBA', fee: 0.95 },
        ],
      },

      internal: {
        visitDate: '2026-09-18',
        visitedBy: 'Partnerships Team (South)',
        notes: 'Management open to a co-delivered CSE specialisation track. Hostel near full; expansion planned for 2027. Placement team small (4 FTE) relative to batch size.',
        partnershipHistory: 'No prior partnership.',
      },
    },

    // ------------------------------------------------------------------
    {
      id: 'aset',
      name: 'Aravalli School of Engineering & Technology',
      shortName: 'ASET',
      aishe: 'C-41877',
      city: 'Jaipur',
      state: 'Rajasthan',
      established: 1998,
      ownership: 'Registered Society',
      category: 'Engineering',
      university: 'Aravalli Technical University',
      campusStatus: 'Operational',
      website: 'www.aset-sample.ac.in',

      regulatory: [
        { body: 'UGC', item: 'Recognition u/s 2(f) & 12(B)', value: E('Recognised', 'UGC HEI List', '2026-07-10', 'govt'), state: 'ok' },
        { body: 'AICTE', item: 'Extension of Approval 2026-27', value: E('Approved', 'AICTE Portal', '2026-05-28', 'govt'), state: 'ok' },
        { body: 'University', item: 'Affiliation', value: E('Affiliated (permanent)', 'University Portal', '2026-08-02', 'verified'), state: 'ok', affiliation: true },
        { body: 'NAAC', item: 'Accreditation', value: E('A (CGPA 3.24)', 'NAAC Portal', '2023-12-04', 'govt'), validUntil: '2028-12-03', state: 'ok', naac: true },
        { body: 'NBA', item: 'CSE, ECE, ME, EE', value: E('Accredited', 'NBA Portal', '2024-07-11', 'govt'), validUntil: '2027-06-30', state: 'ok' },
        { body: 'Autonomy', item: 'Autonomous status', value: E('Autonomous (till 2031)', 'UGC Autonomous Colleges List', '2026-07-10', 'govt'), state: 'ok' },
      ],

      admissions: admissions([
        ['2021-22', 1440, 1420, 1310],
        ['2022-23', 1440, 1450, 1350],
        ['2023-24', 1440, 1460, 1390],
        ['2024-25', 1500, 1520, 1430],
        ['2025-26', 1500, 1530, 1455],
      ], 'AICTE Approval Process', 'University Portal'),

      courses: [
        { name: 'B.Tech CSE', level: 'UG', duration: 4, intake: 420, admitted: 418, status: 'active' },
        { name: 'B.Tech CSE (AI)', level: 'UG', duration: 4, intake: 120, admitted: 120, status: 'new', since: '2024-25' },
        { name: 'B.Tech ECE', level: 'UG', duration: 4, intake: 240, admitted: 231, status: 'active' },
        { name: 'B.Tech Mechanical', level: 'UG', duration: 4, intake: 180, admitted: 162, status: 'active' },
        { name: 'B.Tech Electrical', level: 'UG', duration: 4, intake: 180, admitted: 168, status: 'active' },
        { name: 'B.Tech Civil', level: 'UG', duration: 4, intake: 120, admitted: 96, status: 'active' },
        { name: 'MBA', level: 'PG', duration: 2, intake: 180, admitted: 180, status: 'active' },
        { name: 'M.Tech (3 specialisations)', level: 'PG', duration: 2, intake: 60, admitted: 30, status: 'active' },
        { name: 'MCA', level: 'PG', duration: 2, intake: 0, admitted: 0, status: 'discontinued', since: '2023-24' },
      ],
      coursesSource: E('Course-wise 2025-26', 'University Portal', '2026-09-20', 'verified'),

      placements: placements([
        [2021, 1180, 956, 86, 24, 6.1, 5.4],
        [2022, 1210, 1004, 88, 28, 6.6, 5.8],
        [2023, 1230, 1009, 86, 31, 6.8, 6.0],
        [2024, 1260, 1071, 89, 34, 7.2, 6.4],
        [2025, 1290, 1084, 88, 38, 7.6, 6.7],
      ], 'NIRF Data Submission'),

      recruiters: {
        total: E(212, 'NIRF Data Submission', '2025-12-15', 'govt'),
        repeat: E(161, 'College Placement Report', '2025-09-30', 'self'),
        newCount: E(51, 'College Placement Report', '2025-09-30', 'self'),
        international: E(14, 'College Placement Report', '2025-09-30', 'self'),
        top: ['Orbit Infosystems', 'Thar Semiconductors', 'Peakline Consulting', 'Marwar Power Systems', 'Bluegrid Software', 'Indus Ledger Finance', 'Vertex Automotive', 'Nimbus Tech Services'],
        internships: ['Thar Semiconductors', 'Vertex Automotive', 'Marwar Power Systems', 'Bluegrid Software', 'Tanvi Analytics'],
        sectors: { 'IT': 46, 'BFSI': 16, 'Core': 27, 'Services': 11 },
        locations: { 'Bengaluru': 31, 'NCR': 26, 'Pune': 14, 'Jaipur': 12, 'Abroad': 1, 'Others': 16 },
      },

      nirf: nirf({
        'Engineering': [[2022, 178], [2023, 165], [2024, 151], [2025, 139], [2026, 132]],
        'Management': [[2022, null], [2023, null], [2024, '101-125'], [2025, 98], [2026, 94]],
        'Overall': [[2022, null], [2023, null], [2024, null], [2025, '151-200'], [2026, '151-200']],
      }),

      promoter: {
        trust: 'Aravalli Education Society',
        entityType: 'Society (Rajasthan Societies Registration Act)',
        trustEstablished: 1994,
        registration: E('Reg. No. 88/JPR/1994', 'Registrar of Societies', '2026-08-03', 'verified'),
        promoters: [
          { name: 'Dr. Mahendra Singh Rathore', role: 'President' },
          { name: 'Sunita Agarwal', role: 'Secretary' },
        ],
        board: ['Dr. Mahendra Singh Rathore', 'Sunita Agarwal', 'Prof. R. K. Joshi (Retd.)', 'Ankit Mehta', 'Dr. Farah Qureshi', 'Col. V. S. Shekhawat (Retd.)'],
        keyManagement: [
          { name: 'Prof. Deepak Bansal', role: 'Director' },
          { name: 'Dr. Neha Saxena', role: 'Dean, Corporate Relations' },
          { name: 'Rohit Jain', role: 'CFO' },
        ],
        otherInstitutions: ['Aravalli Business School (2006)', 'Aravalli Public School (1995)'],
        otherBusinesses: [],
        previousInstitutions: [],
        insolvency: E('No records found', 'IBBI Public Records', '2026-09-10', 'verified'),
        legal: [
          { type: 'civil_dispute', party: 'Society', title: 'Contract dispute with civil works vendor', forum: 'Commercial Court, Jaipur', year: 2021, status: 'Settled (2023)', material: false, src: 'eCourts', date: '2026-09-10' },
        ],
      },

      campus: {
        students: E(5610, 'AISHE', '2026-03-31', 'govt'),
        faculty: E(392, 'AICTE Faculty Portal', '2026-05-28', 'govt'),
        facultyAttrition: E(8, 'Management Discussion', '2026-08-22', 'internal'),
        attendance: E(86, 'College MIS', '2026-08-22', 'self'),
        passPct: E(89, 'University Results Portal', '2026-07-25', 'verified'),
        backlogs: E(7, 'University Results Portal', '2026-07-25', 'verified'),
        dropouts: E(2.1, 'AISHE', '2026-03-31', 'govt'),
        graduationRate: E(94, 'AISHE', '2026-03-31', 'govt'),
        higherStudies: E(13, 'NIRF Data Submission', '2025-12-15', 'govt'),
        land: E(48, 'AICTE Mandatory Disclosure', '2026-05-28', 'self'),
        builtUp: E(860000, 'AICTE Mandatory Disclosure', '2026-05-28', 'self'),
        classrooms: E(128, 'AICTE Mandatory Disclosure', '2026-05-28', 'self'),
        labs: E(96, 'AICTE Mandatory Disclosure', '2026-05-28', 'self'),
        library: E(118000, 'AISHE', '2026-03-31', 'govt'),
        hostelCapacity: E(1800, 'Campus Visit', '2026-08-22', 'internal'),
        hostelOccupancy: E(1610, 'Campus Visit', '2026-08-22', 'internal'),
        buses: E(42, 'Campus Visit', '2026-08-22', 'internal'),
        sports: 'Stadium with athletics track, indoor sports complex, swimming pool',
      },

      commercial: {
        capacity: E(5880, 'AICTE Approval Process', '2026-05-28', 'govt'),
        avgFee: E(1.9, 'State Fee Regulatory Committee', '2025-07-01', 'govt'),
        collectionEfficiency: E(95, 'Audited Financials FY25', '2026-08-22', 'internal'),
        outstanding: E(1.8, 'Audited Financials FY25', '2026-08-22', 'internal'),
        scholarshipPct: E(14, 'Audited Financials FY25', '2026-08-22', 'internal'),
        discountPct: E(4, 'Management Discussion', '2026-08-22', 'internal'),
        refunds: E(0.3, 'Audited Financials FY25', '2026-08-22', 'internal'),
        courseFees: [
          { course: 'B.Tech', fee: 1.9 },
          { course: 'MBA', fee: 2.6 },
          { course: 'M.Tech', fee: 1.2 },
        ],
      },

      internal: {
        visitDate: '2026-08-22',
        visitedBy: 'Partnerships Team (North)',
        notes: 'Strong, well-run campus operating near full capacity. Growth would need new programmes or a second shift rather than filling seats. Leadership interested in an MBA specialisation partnership.',
        partnershipHistory: 'Pilot certificate programme 2023 (120 students), renewed 2024.',
      },
    },

    // ------------------------------------------------------------------
    {
      id: 'cips',
      name: 'Coastal Institute of Pharmaceutical Sciences',
      shortName: 'CIPS',
      aishe: 'C-67012',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      established: 2011,
      ownership: 'Private Trust',
      category: 'Pharmacy',
      university: 'Andhra Coastal University',
      campusStatus: 'Operational',
      website: 'www.cips-sample.edu.in',

      regulatory: [
        { body: 'UGC', item: 'Recognition u/s 2(f)', value: E('Recognised', 'UGC HEI List', '2026-07-10', 'govt'), state: 'ok' },
        { body: 'PCI', item: 'Approval 2026-27', value: E('Conditional — faculty shortfall', 'PCI Approval Portal', '2026-06-18', 'govt'), state: 'issue' },
        { body: 'University', item: 'Affiliation', value: E('Provisional — renewal pending', 'University Portal', '2026-08-30', 'verified'), state: 'issue', affiliation: true },
        { body: 'NAAC', item: 'Accreditation', value: E('B (CGPA 2.31)', 'NAAC Portal', '2020-01-21', 'govt'), validUntil: '2025-01-20', state: 'expired', naac: true },
        { body: 'NBA', item: 'B.Pharm', value: E('Not accredited', 'NBA Portal', '2026-07-01', 'govt'), state: 'na' },
        { body: 'Autonomy', item: 'Autonomous status', value: E('Not autonomous', 'UGC Autonomous Colleges List', '2026-07-10', 'govt'), state: 'na' },
      ],

      admissions: admissions([
        ['2021-22', 300, 260, 212],
        ['2022-23', 300, 240, 186],
        ['2023-24', 300, 230, 165],
        ['2024-25', 300, 220, 141],
        ['2025-26', 300, 205, 124],
      ], 'PCI Approval Portal', 'University Portal'),

      courses: [
        { name: 'B.Pharm', level: 'UG', duration: 4, intake: 200, admitted: 88, status: 'active' },
        { name: 'Pharm.D', level: 'UG', duration: 6, intake: 30, admitted: 14, status: 'active' },
        { name: 'M.Pharm (Pharmaceutics)', level: 'PG', duration: 2, intake: 30, admitted: 12, status: 'active' },
        { name: 'M.Pharm (Pharmacology)', level: 'PG', duration: 2, intake: 15, admitted: 6, status: 'active' },
        { name: 'D.Pharm', level: 'Diploma', duration: 2, intake: 25, admitted: 4, status: 'new', since: '2025-26' },
        { name: 'M.Pharm (Pharm. Analysis)', level: 'PG', duration: 2, intake: 0, admitted: 0, status: 'discontinued', since: '2025-26' },
      ],
      coursesSource: E('Course-wise 2025-26', 'University Portal', '2026-09-23', 'verified'),

      placements: placements([
        [2021, 180, 72, 78, 5.5, 2.8, 2.5],
        [2022, 175, 63, 80, 5.0, 2.7, 2.4],
        [2023, 170, 58, 82, 4.8, 2.6, 2.4],
        [2024, 160, 50, 85, 4.6, 2.6, 2.3],
        [2025, 150, 42, 85, 4.2, 2.5, 2.2],
      ], 'AISHE'),

      recruiters: {
        total: E(19, 'College Placement Report', '2025-09-30', 'self'),
        repeat: E(9, 'College Placement Report', '2025-09-30', 'self'),
        newCount: E(10, 'College Placement Report', '2025-09-30', 'self'),
        international: E(0, 'College Placement Report', '2025-09-30', 'self'),
        top: ['Godavari Pharma Ltd', 'MedLine Retail Pharmacy', 'Sagar Biotech', 'CareFirst Hospitals', 'Nova Clinical Research'],
        internships: ['MedLine Retail Pharmacy', 'CareFirst Hospitals'],
        sectors: { 'Pharma Mfg': 38, 'Retail / Hospital': 44, 'Clinical Research': 12, 'Others': 6 },
        locations: { 'Visakhapatnam': 52, 'Hyderabad': 30, 'Others': 18 },
      },

      nirf: nirf({
        'Pharmacy': [[2022, null], [2023, null], [2024, null], [2025, null], [2026, null]],
      }),

      promoter: {
        trust: 'Coastal Educational & Charitable Trust',
        entityType: 'Registered Private Trust',
        trustEstablished: 2009,
        registration: E('Reg. No. 1176/2009', 'Registrar of Trusts', '2026-08-30', 'verified'),
        promoters: [
          { name: 'B. Surya Narayana', role: 'Managing Trustee' },
          { name: 'B. Padmavathi', role: 'Trustee' },
        ],
        board: ['B. Surya Narayana', 'B. Padmavathi', 'G. Kiran Babu'],
        keyManagement: [
          { name: 'Dr. T. Ravi Teja', role: 'Principal (in-charge since 2025)' },
          { name: 'M. Swathi', role: 'Administrative Officer' },
        ],
        otherInstitutions: ['Coastal Nursing College (2014)'],
        otherBusinesses: ['Coastal Agro Exports Pvt Ltd (Director: B. Surya Narayana)'],
        previousInstitutions: ['Coastal Degree College (2010–2018, closed)'],
        insolvency: E('No IBC proceedings; bank recovery suit listed below', 'IBBI Public Records', '2026-09-12', 'verified'),
        legal: [
          { type: 'regulatory_action', party: 'Institution', title: 'Show-cause notice for faculty shortfall and lab deficiencies', forum: 'Pharmacy Council of India', year: 2025, status: 'Pending — response submitted', material: true, src: 'PCI Notice', date: '2025-11-04' },
          { type: 'fir', party: 'Trust management', title: 'FIR registered on complaint by students alleging admission to an unapproved course', forum: 'Police Station, Visakhapatnam', year: 2025, status: 'Under investigation — no charge sheet filed', material: true, src: 'Police FIR record', date: '2026-02-17' },
          { type: 'civil_dispute', party: 'Trust', title: 'Loan recovery application by lender bank (₹6.4 Cr)', forum: 'Debts Recovery Tribunal, Visakhapatnam', year: 2024, status: 'Pending', material: true, src: 'DRT Cause List', date: '2026-09-12' },
          { type: 'acquittal', party: 'Managing Trustee', title: 'Cheque bounce case (s.138 NI Act) — 2017', forum: 'Judicial Magistrate Court', year: 2017, status: 'Acquitted (2020)', material: false, src: 'eCourts', date: '2026-09-12' },
        ],
      },

      campus: {
        students: E(640, 'AISHE', '2026-03-31', 'govt'),
        faculty: E(31, 'PCI Approval Portal', '2026-06-18', 'govt'),
        facultyAttrition: E(26, 'Management Discussion', '2026-09-05', 'internal'),
        attendance: E(69, 'College MIS', '2026-09-05', 'self'),
        passPct: E(58, 'University Results Portal', '2026-07-30', 'verified'),
        backlogs: E(31, 'University Results Portal', '2026-07-30', 'verified'),
        dropouts: E(11.4, 'AISHE', '2026-03-31', 'govt'),
        graduationRate: E(71, 'AISHE', '2026-03-31', 'govt'),
        higherStudies: E(6, 'AISHE', '2026-03-31', 'govt'),
        land: E(6, 'PCI Mandatory Disclosure', '2026-06-18', 'self'),
        builtUp: E(98000, 'PCI Mandatory Disclosure', '2026-06-18', 'self'),
        classrooms: E(14, 'PCI Mandatory Disclosure', '2026-06-18', 'self'),
        labs: E(11, 'PCI Mandatory Disclosure', '2026-06-18', 'self'),
        library: E(9800, 'AISHE', '2026-03-31', 'govt'),
        hostelCapacity: E(300, 'Campus Visit', '2026-09-05', 'internal'),
        hostelOccupancy: E(96, 'Campus Visit', '2026-09-05', 'internal'),
        buses: E(6, 'Campus Visit', '2026-09-05', 'internal'),
        sports: 'Open ground (shared with nursing college)',
      },

      commercial: {
        capacity: E(1260, 'PCI Approval Portal', '2026-06-18', 'govt'),
        avgFee: E(0.95, 'State Fee Regulatory Committee', '2025-07-01', 'govt'),
        collectionEfficiency: E(71, 'Management Discussion', '2026-09-05', 'internal'),
        outstanding: E(2.8, 'Management Discussion', '2026-09-05', 'internal'),
        scholarshipPct: E(46, 'Management Discussion', '2026-09-05', 'internal'),
        discountPct: E(12, 'Management Discussion', '2026-09-05', 'internal'),
        refunds: E(0.38, 'Management Discussion', '2026-09-05', 'internal'),
        courseFees: [
          { course: 'B.Pharm', fee: 0.9 },
          { course: 'Pharm.D', fee: 1.4 },
          { course: 'M.Pharm', fee: 1.1 },
          { course: 'D.Pharm', fee: 0.6 },
        ],
      },

      internal: {
        visitDate: '2026-09-05',
        visitedBy: 'Partnerships Team (South)',
        notes: 'Management keen on partnership and upfront investment. Significant gap between claimed and university-registered admissions. Labs under-equipped; several faculty positions vacant.',
        partnershipHistory: 'Approached us in 2024; declined at screening.',
      },
    },

    // ------------------------------------------------------------------
    {
      id: 'ncasc',
      name: 'Narmada College of Arts, Science & Commerce',
      shortName: 'NCASC',
      aishe: 'C-23560',
      city: 'Indore',
      state: 'Madhya Pradesh',
      established: 1987,
      ownership: 'Registered Society',
      category: 'Arts, Science & Commerce',
      university: 'Malwa State University',
      campusStatus: 'Operational',
      website: 'www.narmada-sample.ac.in',

      regulatory: [
        { body: 'UGC', item: 'Recognition u/s 2(f) & 12(B)', value: E('Recognised', 'UGC HEI List', '2026-07-10', 'govt'), state: 'ok' },
        { body: 'AICTE', item: 'BBA / BCA approval', value: E('Approved', 'AICTE Portal', '2026-06-10', 'govt'), state: 'ok' },
        { body: 'University', item: 'Affiliation', value: E('Affiliated (permanent)', 'University Portal', '2026-08-11', 'verified'), state: 'ok', affiliation: true },
        { body: 'NAAC', item: 'Accreditation', value: E('B+ (CGPA 2.62)', 'NAAC Portal', '2022-08-29', 'govt'), validUntil: '2027-08-28', state: 'ok', naac: true },
        { body: 'NBA', item: '—', value: E('Not applicable', 'NBA Portal', '2026-07-01', 'govt'), state: 'na' },
        { body: 'Autonomy', item: 'Autonomous status', value: E('Not autonomous', 'UGC Autonomous Colleges List', '2026-07-10', 'govt'), state: 'na' },
      ],

      admissions: admissions([
        ['2021-22', 1800, 1500, 1380],
        ['2022-23', 1800, 1560, 1420],
        ['2023-24', 1800, 1600, 1440],
        ['2024-25', 1920, 1640, 1450],
        ['2025-26', 1920, 1700, 1470],
      ], 'University Approved Intake', 'University Portal'),

      courses: [
        { name: 'B.Com', level: 'UG', duration: 3, intake: 600, admitted: 560, status: 'active' },
        { name: 'B.Sc (PCM / CBZ)', level: 'UG', duration: 3, intake: 360, admitted: 248, status: 'active' },
        { name: 'B.A.', level: 'UG', duration: 3, intake: 360, admitted: 196, status: 'active' },
        { name: 'BBA', level: 'UG', duration: 3, intake: 180, admitted: 176, status: 'active' },
        { name: 'BCA', level: 'UG', duration: 3, intake: 180, admitted: 180, status: 'active' },
        { name: 'B.Com (Fintech)', level: 'UG', duration: 3, intake: 120, admitted: 72, status: 'new', since: '2024-25' },
        { name: 'M.Com', level: 'PG', duration: 2, intake: 120, admitted: 38, status: 'active' },
        { name: 'M.A. (Hindi)', level: 'PG', duration: 2, intake: 0, admitted: 0, status: 'discontinued', since: '2024-25' },
      ],
      coursesSource: E('Course-wise 2025-26', 'University Portal', '2026-09-23', 'verified'),

      // No independently verified placement data for this campus
      placements: placements([
        [2021, 610, null, 62, 6.0, 2.9, 2.6],
        [2022, 640, null, 60, 6.5, 3.0, 2.7],
        [2023, 660, null, 64, 7.2, 3.1, 2.8],
        [2024, 690, null, 63, 7.5, 3.2, 2.9],
        [2025, 710, null, 65, 8.0, 3.4, 3.0],
      ], 'College Placement Report'),

      recruiters: {
        total: E(64, 'College Placement Report', '2025-09-30', 'self'),
        repeat: E(38, 'College Placement Report', '2025-09-30', 'self'),
        newCount: E(26, 'College Placement Report', '2025-09-30', 'self'),
        international: E(0, 'College Placement Report', '2025-09-30', 'self'),
        top: ['Indus Ledger Finance', 'Malwa Cooperative Bank', 'Peakline Consulting', 'Orbit Infosystems', 'ShopKart Retail', 'Kaveri Bank'],
        internships: ['Malwa Cooperative Bank', 'ShopKart Retail', 'Ledgerly Accounting LLP'],
        sectors: { 'IT': 21, 'BFSI': 44, 'Core': 4, 'Services': 31 },
        locations: { 'Indore': 55, 'Bhopal': 12, 'Pune': 10, 'Others': 23 },
      },

      nirf: nirf({
        'College': [[2022, null], [2023, null], [2024, null], [2025, '201-300'], [2026, null]],
      }),

      promoter: {
        trust: 'Narmada Shiksha Samiti',
        entityType: 'Society (MP Societies Registrikaran Adhiniyam)',
        trustEstablished: 1985,
        registration: E('Reg. No. 05/IND/1985', 'Registrar of Societies', '2026-08-11', 'verified'),
        promoters: [
          { name: 'Shri Ramesh Chandra Dubey', role: 'President' },
          { name: 'Dr. Kavita Pandey', role: 'Secretary' },
        ],
        board: ['Shri Ramesh Chandra Dubey', 'Dr. Kavita Pandey', 'Ajay Malviya', 'CA Pooja Khandelwal'],
        keyManagement: [
          { name: 'Dr. S. K. Tiwari', role: 'Principal' },
          { name: 'Meena Joshi', role: 'Placement Officer' },
        ],
        otherInstitutions: ['Narmada Higher Secondary School (1985)'],
        otherBusinesses: [],
        previousInstitutions: [],
        insolvency: E('No records found', 'IBBI Public Records', '2026-09-10', 'verified'),
        legal: [],
      },

      campus: {
        students: E(4320, 'AISHE', '2026-03-31', 'govt'),
        faculty: E(162, 'AISHE', '2026-03-31', 'govt'),
        facultyAttrition: E(9, 'Management Discussion', '2026-09-26', 'internal'),
        attendance: E(72, 'College MIS', '2026-09-26', 'self'),
        passPct: E(76, 'University Results Portal', '2026-07-20', 'verified'),
        backlogs: E(14, 'University Results Portal', '2026-07-20', 'verified'),
        dropouts: E(7.8, 'AISHE', '2026-03-31', 'govt'),
        graduationRate: E(80, 'AISHE', '2026-03-31', 'govt'),
        higherStudies: E(22, 'AISHE', '2026-03-31', 'govt'),
        land: E(11, 'NAAC SSR', '2022-08-29', 'self'),
        builtUp: E(240000, 'NAAC SSR', '2022-08-29', 'self'),
        classrooms: E(64, 'NAAC SSR', '2022-08-29', 'self'),
        labs: E(22, 'NAAC SSR', '2022-08-29', 'self'),
        library: E(61000, 'AISHE', '2026-03-31', 'govt'),
        hostelCapacity: E(240, 'Campus Visit', '2026-09-26', 'internal'),
        hostelOccupancy: E(205, 'Campus Visit', '2026-09-26', 'internal'),
        buses: E(9, 'Campus Visit', '2026-09-26', 'internal'),
        sports: 'Playground, indoor badminton hall',
      },

      commercial: {
        capacity: E(5520, 'University Approved Intake', '2026-08-11', 'govt'),
        avgFee: E(0.42, 'University Fee Schedule', '2025-06-15', 'govt'),
        collectionEfficiency: E(91, 'Audited Financials FY25', '2026-09-26', 'internal'),
        outstanding: E(0.9, 'Audited Financials FY25', '2026-09-26', 'internal'),
        scholarshipPct: E(29, 'Audited Financials FY25', '2026-09-26', 'internal'),
        discountPct: E(3, 'Management Discussion', '2026-09-26', 'internal'),
        refunds: E(0.08, 'Audited Financials FY25', '2026-09-26', 'internal'),
        courseFees: [
          { course: 'B.Com / B.A. / B.Sc', fee: 0.32 },
          { course: 'BBA / BCA', fee: 0.65 },
          { course: 'B.Com (Fintech)', fee: 0.85 },
          { course: 'M.Com', fee: 0.4 },
        ],
      },

      internal: {
        visitDate: '2026-09-26',
        visitedBy: 'Partnerships Team (Central)',
        notes: 'Stable, well-regarded local college. Placement numbers are self-reported only — request offer letters / company confirmations. Interest in a fintech / analytics add-on programme.',
        partnershipHistory: 'No prior partnership.',
      },
    },
  ];

  window.SAMPLE_DATA = { institutions };
})();
