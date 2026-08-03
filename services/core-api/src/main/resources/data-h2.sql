INSERT INTO patients(patient_id, his_patient_id, display_name, sex, age) VALUES
('P001','HIS-P001','合成患者A','F',66),
('P002','HIS-P002','合成患者B','M',72),
('P003','HIS-P003','合成患者C','F',59),
('P004','HIS-P004','合成患者D','M',68),
('P005','HIS-P005','合成患者E','F',81);

INSERT INTO encounters(encounter_id, patient_id, department, diagnosis, scenario, data_version, admitted_at) VALUES
('E001','P001','呼吸内科','社区获得性肺炎','normal',3,'2026-08-03 08:10:00'),
('E002-1','P002','呼吸内科','药物过敏确认住院记录','prior_allergy',2,'2026-05-04 08:00:00'),
('E002-2','P002','呼吸内科','社区获得性肺炎，第二次入院','confirmed_allergy_second_admission',4,'2026-08-03 08:30:00'),
('E003','P003','呼吸内科','社区获得性肺炎','severe_adr',2,'2026-08-03 09:00:00'),
('E004','P004','呼吸内科','社区获得性肺炎','cross_department_duplicate_or_conflict',5,'2026-08-03 09:20:00'),
('E004-CARD','P004','心内科','心律失常观察','parallel_department',5,'2026-08-03 07:50:00'),
('E005','P005','呼吸内科','社区获得性肺炎','critical_lab_missing',1,'2026-08-03 09:45:00');

INSERT INTO department_participation(id, encounter_id, department, role, doctor_name, active) VALUES
('DP001','E001','呼吸内科','主管','陈医生',true),
('DP004A','E004','呼吸内科','主管','陈医生',true),
('DP004B','E004-CARD','心内科','参与','林医生',true);

INSERT INTO source_identifier_mapping(internal_id, source_system, source_id, object_type, version) VALUES
('P001','HIS','HIS-P001','PatientProfile',1), ('E001','HIS','HIS-E001','Encounter',3), ('P002','HIS','HIS-P002','PatientProfile',1), ('E002-2','HIS','HIS-E002-2','Encounter',4), ('P004','HIS','HIS-P004','PatientProfile',1), ('E004','HIS','HIS-E004','Encounter',5);

INSERT INTO diagnosis(id, encounter_id, name, status, source_id, collected_at) VALUES
('DX001','E001','社区获得性肺炎','active','HIS-DX001','2026-08-03 08:20:00'),
('DX002','E002-2','社区获得性肺炎','active','HIS-DX002','2026-08-03 08:40:00'),
('DX003','E003','社区获得性肺炎','active','HIS-DX003','2026-08-03 09:10:00'),
('DX004','E004','社区获得性肺炎','active','HIS-DX004','2026-08-03 09:30:00'),
('DX005','E005','社区获得性肺炎','active','HIS-DX005','2026-08-03 09:55:00');

INSERT INTO lab_result(id, encounter_id, code, name, lab_value, unit, missing_status, source_id, collected_at) VALUES
('LAB001','E001','CRP','C反应蛋白','42','mg/L','present','LIS-001','2026-08-03 08:50:00'), ('LAB002','E001','CREA','肌酐','76','umol/L','present','LIS-002','2026-08-03 08:50:00'),
('LAB003','E002-2','CRP','C反应蛋白','65','mg/L','present','LIS-003','2026-08-03 09:00:00'), ('LAB004','E002-2','CREA','肌酐','90','umol/L','present','LIS-004','2026-08-03 09:00:00'),
('LAB005','E003','CRP','C反应蛋白','58','mg/L','present','LIS-005','2026-08-03 09:20:00'), ('LAB006','E003','CREA','肌酐','84','umol/L','present','LIS-006','2026-08-03 09:20:00'),
('LAB007','E004','CRP','C反应蛋白','51','mg/L','present','LIS-007','2026-08-03 09:40:00'), ('LAB008','E004','CREA','肌酐','82','umol/L','present','LIS-008','2026-08-03 09:40:00'),
('LAB009','E005','CRP','C反应蛋白',NULL,'mg/L','missing','LIS-009','2026-08-03 10:00:00'), ('LAB010','E005','CREA','肌酐',NULL,'umol/L','missing','LIS-010','2026-08-03 10:00:00');

INSERT INTO drug_catalog(drug_code, name, pharmacology_class, status) VALUES
('D-AMOX','阿莫西林克拉维酸钾','青霉素类','active'), ('D-CEF','头孢曲松','头孢菌素类','active'), ('D-AZI','阿奇霉素','大环内酯类','active'), ('D-LEV','左氧氟沙星','喹诺酮类','active'), ('D-VAN','万古霉素','糖肽类','inactive');

INSERT INTO allergy_event(id, patient_id, drug_code, drug_name, status, severity, source_id, confirmed_at) VALUES ('ALG-P002-AMOX','P002','D-AMOX','阿莫西林克拉维酸钾','confirmed','high','HIS-ALG-002','2026-05-06 10:00:00');
INSERT INTO adverse_drug_reaction(id, patient_id, drug_code, drug_name, severity, review_status, source_id, reviewed_at) VALUES ('ADR-P003-LEV','P003','D-LEV','左氧氟沙星','severe','reviewed','PHARM-ADR-003','2026-07-12 11:00:00');
INSERT INTO medication_order(id, encounter_id, patient_id, drug_code, drug_name, pharmacology_class, department, status, source_id, updated_at) VALUES ('ORD-P004-AZI','E004-CARD','P004','D-AZI','阿奇霉素','大环内酯类','心内科','active','HIS-ORD-004','2026-08-03 08:15:00');
INSERT INTO medication_exposure(id, patient_id, encounter_id, drug_code, drug_name, started_at, ended_at) VALUES ('EXP-P002-AMOX','P002','E002-1','D-AMOX','阿莫西林克拉维酸钾','2026-05-04 10:00:00','2026-05-06 10:00:00');
INSERT INTO evidence_document(evidence_id, title, status, version, effective_date, scope, locator, text) VALUES
('EV-CAP-001','CAP演示证据集：住院成人初始抗感染路径','demo_unpublished','2026.08-demo','2026-08-03','呼吸内科/社区获得性肺炎','第2页-初始方案','演示证据：候选药物必须来自院内目录；无明确过敏或严重不良反应时，可比较β内酰胺类、头孢菌素类、大环内酯类和喹诺酮类方案。'),
('EV-CAP-002','CAP演示证据集：监测要求','demo_unpublished','2026.08-demo','2026-08-03','呼吸内科/社区获得性肺炎','第4页-监测项目','演示证据：推荐前需检查过敏史、当前有效用药和关键检验；关键检验缺失时不得按正常值处理。');
