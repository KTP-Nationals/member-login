-- KTP Member Directory — sample seed data
-- Run in Supabase: Dashboard → SQL Editor, AFTER member_directory_schema.sql.
--
-- These are placeholder/demo records, NOT real people. Delete this data
-- and load your real active-member roster before sharing this beyond a
-- demo — columns match a typical export (First Name, Last Name, School
-- Email, LinkedIn, Resume Link, Major, Grad Date), so a CSV with those
-- headers renamed to snake_case should import directly via the Table
-- Editor's CSV import (see README.md, "Updating the roster").

insert into public.member_directory (first_name, last_name, school_email, linkedin, resume_link, major, grad_date) values
  ('Ava', 'Sullivan', 'ava.sullivan@cornell.edu', 'https://linkedin.com/in/ava-sullivan', 'https://drive.google.com/file/d/demo-ava-sullivan/view', 'Computer Science', '2027'),
  ('Liam', 'Osei', 'liam.osei@cornell.edu', 'https://linkedin.com/in/liam-osei', null, 'Business Administration', '2026'),
  ('Sophia', 'Nakamura', 'sophia.nakamura@berkeley.edu', 'https://linkedin.com/in/sophia-nakamura', 'https://drive.google.com/file/d/demo-sophia-nakamura/view', 'Finance', '2026'),
  ('Ethan', 'Delgado', 'ethan.delgado@cornell.edu', null, null, 'Information Science', '2028'),
  ('Mia', 'Kowalski', 'mia.kowalski@nyu.edu', 'https://linkedin.com/in/mia-kowalski', 'https://drive.google.com/file/d/demo-mia-kowalski/view', 'Economics', '2027'),
  ('Noah', 'Whitmore', 'noah.whitmore@umich.edu', 'https://linkedin.com/in/noah-whitmore', null, 'Statistics', '2026'),
  ('Isabella', 'Cruz', 'isabella.cruz@utexas.edu', 'https://linkedin.com/in/isabella-cruz', 'https://drive.google.com/file/d/demo-isabella-cruz/view', 'Marketing', '2028'),
  ('Lucas', 'Bergman', 'lucas.bergman@cornell.edu', 'https://linkedin.com/in/lucas-bergman', 'https://drive.google.com/file/d/demo-lucas-bergman/view', 'Computer Science', '2027'),
  ('Chloe', 'Farrell', 'chloe.farrell@berkeley.edu', null, null, 'Accounting', '2026'),
  ('Aiden', 'Okonkwo', 'aiden.okonkwo@nyu.edu', 'https://linkedin.com/in/aiden-okonkwo', 'https://drive.google.com/file/d/demo-aiden-okonkwo/view', 'Operations Research', '2028'),
  ('Emma', 'Sato', 'emma.sato@cornell.edu', 'https://linkedin.com/in/emma-sato', null, 'Applied Economics & Management', '2027'),
  ('Owen', 'Rasmussen', 'owen.rasmussen@umich.edu', 'https://linkedin.com/in/owen-rasmussen', 'https://drive.google.com/file/d/demo-owen-rasmussen/view', 'Information Systems', '2026'),
  ('Harper', 'Abara', 'harper.abara@utexas.edu', 'https://linkedin.com/in/harper-abara', null, 'Computer Science', '2028'),
  ('Elijah', 'Vance', 'elijah.vance@cornell.edu', 'https://linkedin.com/in/elijah-vance', 'https://drive.google.com/file/d/demo-elijah-vance/view', 'Finance', '2027'),
  ('Layla', 'Hoffman', 'layla.hoffman@berkeley.edu', null, null, 'Business Analytics', '2026'),
  ('Sebastian', 'Ruiz', 'sebastian.ruiz@nyu.edu', 'https://linkedin.com/in/sebastian-ruiz', 'https://drive.google.com/file/d/demo-sebastian-ruiz/view', 'Economics', '2028'),
  ('Zara', 'Patel', 'zara.patel@cornell.edu', 'https://linkedin.com/in/zara-patel', 'https://drive.google.com/file/d/demo-zara-patel/view', 'Marketing', '2027'),
  ('Gabriel', 'Lindqvist', 'gabriel.lindqvist@umich.edu', 'https://linkedin.com/in/gabriel-lindqvist', null, 'Computer Science', '2026'),
  ('Nora', 'Fitzgerald', 'nora.fitzgerald@utexas.edu', 'https://linkedin.com/in/nora-fitzgerald', 'https://drive.google.com/file/d/demo-nora-fitzgerald/view', 'Statistics', '2028'),
  ('Julian', 'Abbas', 'julian.abbas@cornell.edu', 'https://linkedin.com/in/julian-abbas', null, 'Finance', '2027');
