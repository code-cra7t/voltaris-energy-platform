-- A shift handoff in progress: one job is already approved; the new fault remains open.
UPDATE incidents SET reported_at=now()-interval '3 hours',updated_at=now()
WHERE asset_id=(SELECT id FROM assets WHERE asset_code='VC-HAN-001');

UPDATE incidents SET reported_at=now()-interval '1 day',updated_at=now()
WHERE asset_id=(SELECT id FROM assets WHERE asset_code='VC-HAN-005');

-- Keep the invited workspace's financial history current as the calendar advances.
INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,source_reference)
SELECT d.month_start::date,'recognized_revenue','service_contract',c.monthly_fee_cents,
       'Monthly managed charging service invoice',s.id,
       'SYN-INV-'||to_char(d.month_start,'YYYYMM')||'-'||replace(s.name,' ','-')
FROM contracts c JOIN sites s ON s.id=c.site_id
CROSS JOIN generate_series(date_trunc('month',current_date)-interval '5 months',
                           date_trunc('month',current_date),interval '1 month') AS d(month_start)
ON CONFLICT (source_reference) DO NOTHING;

INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,source_reference)
SELECT (d.month_start+interval '14 days')::date,'actual_cost',x.category,
       CASE WHEN s.region='Hannover' THEN x.hannover_cents ELSE x.base_cents END,
       x.description,s.id,
       'SYN-COST-'||to_char(d.month_start,'YYYYMM')||'-'||replace(s.name,' ','-')||'-'||x.category
FROM sites s
CROSS JOIN generate_series(date_trunc('month',current_date)-interval '5 months',
                           date_trunc('month',current_date),interval '1 month') AS d(month_start)
CROSS JOIN (VALUES
  ('technician_hours',158000,183000,'Field technician labour and overtime'),
  ('travel',26000,77000,'Technician travel and dispatch mileage'),
  ('replacement_parts',34000,116000,'Replacement parts and repeat repair materials'),
  ('outage_credits',12000,46000,'Customer service credits for charger outages')
) AS x(category,base_cents,hannover_cents,description)
WHERE (d.month_start+interval '14 days')::date<=current_date
ON CONFLICT (source_reference) DO NOTHING;

WITH chosen AS (
  SELECT i.id incident_id, a.site_id, t.id technician_id, s.id slot_id
  FROM incidents i
  JOIN assets a ON a.id=i.asset_id AND a.asset_code='VC-HAN-005'
  JOIN technicians t ON t.name='Lena Schneider'
  JOIN availability_slots s ON s.technician_id=t.id AND s.status='available' AND s.starts_at>now()
  ORDER BY s.starts_at LIMIT 1
), proposal AS (
  INSERT INTO dispatch_proposals(incident_id,technician_id,slot_id,rationale,work_summary,forecast_cost_cents,status)
  SELECT incident_id,technician_id,slot_id,
    'Priority service contract and repeat temperature warning; assigned a qualified local technician.',
    'Inspect ventilation, thermal logs, and power-module cooling path.',34500,'approved' FROM chosen
  RETURNING id,incident_id,technician_id,slot_id,forecast_cost_cents
), booked AS (
  UPDATE availability_slots SET status='booked' WHERE id=(SELECT slot_id FROM proposal) RETURNING id
), order_record AS (
  INSERT INTO work_orders(incident_id,proposal_id,technician_id,slot_id,status,forecast_cost_cents)
  SELECT p.incident_id,p.id,p.technician_id,p.slot_id,'scheduled',p.forecast_cost_cents
  FROM proposal p JOIN booked b ON b.id=p.slot_id RETURNING id,incident_id,forecast_cost_cents
), approval AS (
  INSERT INTO approvals(incident_id,proposal_id,actor,decision,reason)
  SELECT incident_id,id,'Lea Fischer · shift dispatcher','approved','Pre-shift handoff booking' FROM proposal RETURNING id
), action_record AS (
  INSERT INTO agent_actions(incident_id,action,outcome,detail,actor)
  SELECT incident_id,'dispatch_approved','success','Scheduled service visit with forecast cost; awaiting completion.',
    'Lea Fischer · shift dispatcher' FROM order_record RETURNING id
), updated AS (
  UPDATE incidents SET status='scheduled',updated_at=now()
  WHERE id=(SELECT incident_id FROM order_record) RETURNING id
)
INSERT INTO financial_events(occurred_on,kind,category,amount_cents,description,site_id,work_order_id,source_reference)
SELECT current_date,'forecast_cost','field_service',o.forecast_cost_cents,
  'Approved temperature-warning service visit',a.site_id,o.id,'SANDBOX-FORECAST-'||o.id::text
FROM order_record o JOIN incidents i ON i.id=o.incident_id JOIN assets a ON a.id=i.asset_id
CROSS JOIN approval CROSS JOIN action_record CROSS JOIN updated;
