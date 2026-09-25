-- Fictional Voltaris Energy records. Every product action after seeding uses the live database.

INSERT INTO sites(name,region,city,address) VALUES
  ('Hannover Messe Hub','Hannover','Hannover','Messegelände 1, 30521 Hannover'),
  ('Hannover North Logistics','Hannover','Hannover','Vahrenwalder Straße 255, 30179 Hannover'),
  ('Lehrte Freight Campus','Hannover','Lehrte','Industriestraße 4, 31275 Lehrte'),
  ('Berlin Adlershof Campus','Berlin','Berlin','Rudower Chaussee 17, 12489 Berlin'),
  ('Berlin West Fleet Depot','Berlin','Berlin','Spandauer Damm 92, 14059 Berlin'),
  ('Hamburg Port Service','Hamburg','Hamburg','Hermann-Blohm-Straße 3, 20457 Hamburg'),
  ('Hamburg Altona Mobility','Hamburg','Hamburg','Stresemannstraße 301, 22761 Hamburg'),
  ('Göttingen Innovation Park','Göttingen','Göttingen','Anna-Vandenhoeck-Ring 5, 37081 Göttingen')
ON CONFLICT (name) DO NOTHING;

INSERT INTO assets(site_id,asset_code,manufacturer,model,status,installed_on)
SELECT s.id, x.asset_code, x.manufacturer, x.model, x.status, x.installed_on::date
FROM (VALUES
  ('Hannover Messe Hub','VC-HAN-001','Voltaris','VDC-150','degraded','2024-03-14'),
  ('Hannover Messe Hub','VC-HAN-002','Voltaris','VDC-150','operational','2024-03-14'),
  ('Hannover North Logistics','VC-HAN-003','Voltaris','VDC-150','operational','2024-07-08'),
  ('Hannover North Logistics','VC-HAN-004','Voltaris','VAC-22','operational','2024-07-08'),
  ('Lehrte Freight Campus','VC-HAN-005','Voltaris','VDC-150','degraded','2025-01-19'),
  ('Berlin Adlershof Campus','VC-BER-001','Voltaris','VDC-150','operational','2024-05-23'),
  ('Berlin Adlershof Campus','VC-BER-002','Voltaris','VAC-22','operational','2024-05-23'),
  ('Berlin West Fleet Depot','VC-BER-003','Voltaris','VDC-150','operational','2025-02-11'),
  ('Hamburg Port Service','VC-HAM-001','Voltaris','VDC-150','operational','2024-02-09'),
  ('Hamburg Port Service','VC-HAM-002','Voltaris','VDC-150','operational','2024-02-09'),
  ('Hamburg Altona Mobility','VC-HAM-003','Voltaris','VAC-22','operational','2025-04-16'),
  ('Göttingen Innovation Park','VC-GOE-001','Voltaris','VAC-22','operational','2025-08-01')
) AS x(site_name,asset_code,manufacturer,model,status,installed_on)
JOIN sites s ON s.name=x.site_name
ON CONFLICT (asset_code) DO NOTHING;

INSERT INTO contracts(site_id,name,service_level,response_hours,monthly_fee_cents,starts_on)
SELECT s.id, 'Voltaris Managed Charging',
       CASE WHEN s.region='Hannover' THEN 'Priority' ELSE 'Standard' END,
       CASE WHEN s.region='Hannover' THEN 24 ELSE 48 END,
       CASE WHEN s.region='Hannover' THEN 510000 ELSE 390000 END,
       DATE '2026-01-01'
FROM sites s
WHERE NOT EXISTS (SELECT 1 FROM contracts c WHERE c.site_id=s.id AND c.name='Voltaris Managed Charging');

INSERT INTO maintenance_logs(asset_id,occurred_at,summary,cost_cents,source_reference)
SELECT a.id,x.occurred_at::timestamptz,x.summary,x.cost_cents,x.source_reference
FROM (VALUES
  ('VC-HAN-001','2026-07-18 09:30+02','Intermittent connector locking errors during peak sessions; connector assembly cleaned and reset. Fault returned after two weeks.',21800,'ML-HAN-001-20260718'),
  ('VC-HAN-001','2026-08-11 14:20+02','Repeated communication timeout and connector lock alert. Firmware version checked; technician recommended cable and lock assembly inspection.',32700,'ML-HAN-001-20260811'),
  ('VC-HAN-005','2026-08-29 11:00+02','Power-module temperature warning; ventilation obstruction removed. Monitoring advised.',19400,'ML-HAN-005-20260829'),
  ('VC-BER-001','2026-06-08 10:00+02','Routine inspection completed; no recurring fault observed.',11900,'ML-BER-001-20260608')
) AS x(asset_code,occurred_at,summary,cost_cents,source_reference)
JOIN assets a ON a.asset_code=x.asset_code
ON CONFLICT (source_reference) DO NOTHING;

INSERT INTO knowledge_documents(title,source_type,source_reference,manufacturer,model) VALUES
  ('VDC-150 field triage guide','runbook','KB-VDC150-TRIAGE','Voltaris','VDC-150'),
  ('EV charger communication fault policy','runbook','KB-COMMS-POLICY','Voltaris',NULL),
  ('Field service dispatch and safety standard','runbook','KB-FIELD-SAFETY',NULL,NULL)
ON CONFLICT (source_reference) DO NOTHING;

INSERT INTO knowledge_chunks(document_id,chunk_index,content)
SELECT d.id,x.chunk_index,x.content FROM (VALUES
  ('KB-VDC150-TRIAGE',0,'Repeated connector-lock alerts on VDC-150 units can be associated with wear in the lock assembly, cable strain, or a sensor alignment issue. Review the asset history and diagnostic event codes before replacing parts. A trained field technician must inspect the physical assembly.'),
  ('KB-VDC150-TRIAGE',1,'For a VDC-150 communication timeout, check whether the event is isolated to one connector or affects the entire charging cabinet. Correlate timestamps with network and controller logs. Do not remotely override safety interlocks.'),
  ('KB-COMMS-POLICY',0,'If communication faults recur after a prior reset, create a service work order and preserve fault logs. Mark customer-facing availability as degraded until a qualified technician confirms the cause.'),
  ('KB-FIELD-SAFETY',0,'AI recommendations are advisory. Only authorized technicians may isolate power, inspect electrical components, or restore equipment. A dispatcher must approve appointments and notify the site contact.'),
  ('KB-FIELD-SAFETY',1,'Check the active service contract response target and technician qualification before dispatch. If no slot is available within the target, escalate the SLA risk rather than claiming compliance.')
) AS x(source_reference,chunk_index,content)
JOIN knowledge_documents d ON d.source_reference=x.source_reference
ON CONFLICT (document_id,chunk_index) DO NOTHING;

INSERT INTO technicians(name,base_city,active) VALUES
  ('Mara Hoffmann','Hannover',true),
  ('Jonas Becker','Hannover',true),
  ('Lena Schneider','Lehrte',true),
  ('Amir Yilmaz','Berlin',true),
  ('Elisa Brandt','Hamburg',true),
  ('Noah Weber','Göttingen',true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO technician_skills(technician_id,skill)
SELECT t.id,'ev_charger' FROM technicians t
ON CONFLICT DO NOTHING;

INSERT INTO technician_skills(technician_id,skill)
SELECT t.id,'high_voltage' FROM technicians t WHERE t.name IN ('Mara Hoffmann','Lena Schneider','Amir Yilmaz','Elisa Brandt')
ON CONFLICT DO NOTHING;

INSERT INTO availability_slots(technician_id,starts_at,ends_at)
SELECT t.id,
       ((d.day::date + time '09:00') AT TIME ZONE 'Europe/Berlin'),
       ((d.day::date + time '12:00') AT TIME ZONE 'Europe/Berlin')
FROM technicians t
CROSS JOIN generate_series(CURRENT_DATE+1,CURRENT_DATE+14,interval '1 day') AS d(day)
WHERE extract(isodow FROM d.day)<6
ON CONFLICT (technician_id,starts_at) DO NOTHING;

INSERT INTO availability_slots(technician_id,starts_at,ends_at)
SELECT t.id,
       ((d.day::date + time '13:00') AT TIME ZONE 'Europe/Berlin'),
       ((d.day::date + time '16:00') AT TIME ZONE 'Europe/Berlin')
FROM technicians t
CROSS JOIN generate_series(CURRENT_DATE+1,CURRENT_DATE+14,interval '1 day') AS d(day)
WHERE extract(isodow FROM d.day)<6
ON CONFLICT (technician_id,starts_at) DO NOTHING;

INSERT INTO incidents(asset_id,summary,description,status,priority,reported_by,reported_at)
SELECT a.id,'Repeated connector lock and communication faults',
       'Charging site reports repeated connector lock failures and communication timeouts on VDC-150 unit VC-HAN-001 after two prior visits. Sessions are intermittently unavailable.',
       'open','high','operations@voltaris.example','2026-09-25 08:40+02'
FROM assets a WHERE a.asset_code='VC-HAN-001'
AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.asset_id=a.id AND i.summary='Repeated connector lock and communication faults');

INSERT INTO incidents(asset_id,summary,description,status,priority,reported_by,reported_at)
SELECT a.id,'Temperature warning at freight campus',
       'The charging unit has issued another temperature warning during afternoon peak use. Request maintenance review and a qualified field appointment.',
       'open','medium','operations@voltaris.example','2026-09-24 15:10+02'
FROM assets a WHERE a.asset_code='VC-HAN-005'
AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.asset_id=a.id AND i.summary='Temperature warning at freight campus');

-- Historical financial events. Every value is synthetic but is stored as a real source record.
INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,source_reference)
SELECT d.month_start::date, 'recognized_revenue','service_contract',c.monthly_fee_cents,
       'Monthly managed charging service invoice',s.id,
       'SYN-INV-'||to_char(d.month_start,'YYYYMM')||'-'||replace(s.name,' ','-')
FROM contracts c JOIN sites s ON s.id=c.site_id
CROSS JOIN generate_series(DATE '2026-04-01',DATE '2026-09-01',interval '1 month') AS d(month_start)
ON CONFLICT (source_reference) DO NOTHING;

INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,source_reference)
SELECT (d.month_start + interval '14 days')::date,'actual_cost',x.category,
       CASE
         WHEN s.region='Hannover' AND d.month_start>=DATE '2026-07-01' THEN x.hannover_q3_cents
         ELSE x.base_cents
       END,
       x.description,s.id,
       'SYN-COST-'||to_char(d.month_start,'YYYYMM')||'-'||replace(s.name,' ','-')||'-'||x.category
FROM sites s
CROSS JOIN generate_series(DATE '2026-04-01',DATE '2026-09-01',interval '1 month') AS d(month_start)
CROSS JOIN (VALUES
  ('technician_hours',158000,183000,'Field technician labour and overtime'),
  ('travel',26000,77000,'Technician travel and dispatch mileage'),
  ('replacement_parts',34000,116000,'Replacement parts and repeat repair materials'),
  ('outage_credits',12000,46000,'Customer service credits for charger outages')
) AS x(category,base_cents,hannover_q3_cents,description)
ON CONFLICT (source_reference) DO NOTHING;
