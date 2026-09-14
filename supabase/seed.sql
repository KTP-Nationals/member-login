-- KTP Alumni Directory — sample seed data
-- Run in Supabase: Dashboard → SQL Editor, AFTER schema.sql.
--
-- These are placeholder/demo records, NOT real people. Delete this data
-- and load your chapter's real roster before sharing this beyond a demo
-- (e.g. via the Table Editor's CSV import, or your own INSERT statements
-- in this same shape).

insert into public.alumni (name, chapter, company, title, grad_year, location) values
  ('Maya Chen', 'Cornell', 'Google', 'Product Manager', 2019, 'New York, NY'),
  ('Ethan Brooks', 'Cornell', 'Goldman Sachs', 'Investment Banking Analyst', 2022, 'New York, NY'),
  ('Priya Patel', 'Cornell', 'McKinsey & Company', 'Management Consultant', 2020, 'Boston, MA'),
  ('Daniel Kim', 'Cornell', 'Meta', 'Software Engineer', 2021, 'San Francisco, CA'),

  ('Sofia Martinez', 'UC Berkeley', 'Salesforce', 'Account Executive', 2018, 'San Francisco, CA'),
  ('Jordan Lee', 'UC Berkeley', 'Tesla', 'Operations Manager', 2017, 'Los Angeles, CA'),
  ('Olivia Turner', 'UC Berkeley', 'Apple', 'UX Designer', 2023, 'San Francisco, CA'),
  ('Marcus Bell', 'UC Berkeley', 'Stripe', 'Data Scientist', 2020, 'San Francisco, CA'),

  ('Grace Nguyen', 'NYU', 'JPMorgan Chase', 'Financial Analyst', 2021, 'New York, NY'),
  ('Liam Fitzgerald', 'NYU', 'Bloomberg LP', 'Business Analyst', 2019, 'New York, NY'),
  ('Amara Osei', 'NYU', 'Morgan Stanley', 'Risk Analyst', 2022, 'New York, NY'),
  ('Noah Whitfield', 'NYU', 'Deloitte', 'Strategy Associate', 2016, 'New York, NY'),

  ('Isabella Rossi', 'University of Michigan', 'Amazon', 'Product Manager', 2018, 'Seattle, WA'),
  ('Caleb Johnson', 'University of Michigan', 'Ford Motor Company', 'Operations Manager', 2015, 'Chicago, IL'),
  ('Zoe Anderson', 'University of Michigan', 'Bain & Company', 'Management Consultant', 2020, 'Chicago, IL'),
  ('Ravi Sharma', 'University of Michigan', 'Microsoft', 'Software Engineer', 2022, 'Seattle, WA'),

  ('Emily Zhao', 'UT Austin', 'Dell Technologies', 'Marketing Manager', 2017, 'Austin, TX'),
  ('Tyler Reyes', 'UT Austin', 'IBM', 'Business Analyst', 2021, 'Austin, TX'),
  ('Hannah Park', 'UT Austin', 'Accenture', 'Management Consultant', 2019, 'Austin, TX'),
  ('Diego Fernandez', 'UT Austin', 'Tesla', 'Corporate Development Associate', 2023, 'Austin, TX'),

  ('Aisha Rahman', 'Indiana University', 'EY', 'Financial Analyst', 2020, 'Chicago, IL'),
  ('Nathan Cole', 'Indiana University', 'KPMG', 'Risk Analyst', 2018, 'Chicago, IL'),
  ('Chloe Bennett', 'Indiana University', 'PwC', 'Business Analyst', 2022, 'Indianapolis, IN'),
  ('Samuel Okafor', 'Indiana University', 'Cummins', 'Operations Manager', 2016, 'Indianapolis, IN'),

  ('Mia Rodriguez', 'Ohio State', 'JPMorgan Chase', 'Investment Banking Analyst', 2021, 'Chicago, IL'),
  ('Benjamin Hayes', 'Ohio State', 'Nationwide', 'Data Analyst', 2019, 'Columbus, OH'),
  ('Layla Ahmed', 'Ohio State', 'Deloitte', 'Strategy Associate', 2017, 'Columbus, OH'),
  ('Connor Walsh', 'Ohio State', 'Google', 'Software Engineer', 2023, 'New York, NY'),

  ('Nina Petrova', 'University of Maryland', 'Booz Allen Hamilton', 'Management Consultant', 2018, 'Washington, DC'),
  ('Jackson Wu', 'University of Maryland', 'Amazon', 'Product Manager', 2020, 'Washington, DC'),
  ('Fatima Siddiqui', 'University of Maryland', 'Capital One', 'Financial Analyst', 2022, 'Washington, DC'),
  ('Austin Reed', 'University of Maryland', 'Deloitte', 'Business Analyst', 2016, 'Washington, DC'),

  ('Emma Larsson', 'University of Washington', 'Microsoft', 'Program Manager', 2019, 'Seattle, WA'),
  ('Derek Huang', 'University of Washington', 'Amazon', 'Software Engineer', 2021, 'Seattle, WA'),
  ('Victoria Campbell', 'University of Washington', 'Boston Consulting Group', 'Management Consultant', 2017, 'Seattle, WA'),
  ('Omar Haddad', 'University of Washington', 'Adobe', 'UX Designer', 2023, 'Seattle, WA');
