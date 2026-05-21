-- Seed: 16 real items (clearance + exam-season). Idempotent via ON CONFLICT.
-- All-day items are stored at end-of-day IST (+05:30) so "overdue" only fires
-- after the day actually finishes in the user's local time.

insert into public.tasks (id, title, due_at, is_all_day, type, priority, tag, subject, note) values
('home-collect',         'Go home — collect 4 assignment books',          '2026-05-24 23:59:59+05:30', true, 'errand', 'high',   null,    null,  'Sat or Sun. Sister finishing last book — confirm before going.'),
('return-clg',           'Back to college',                               '2026-05-25 23:59:59+05:30', true, 'errand', 'normal', null,    null,  'Monday'),
('clearance',            'Submit books · sign clearance · hall ticket',   '2026-05-26 23:59:59+05:30', true, 'task',   'high',   null,    null,  'Mon–Tue at college.'),

('dl-prep-1',  'DL prep',                  '2026-05-30 23:59:59+05:30', true, 'study', 'normal', 'exams', 'DL',  ''),
('hpc-prep-1', 'HPC prep',                 '2026-05-31 23:59:59+05:30', true, 'study', 'normal', 'exams', 'HPC', ''),
('hpc-prep-2', 'HPC prep — final',         '2026-06-01 23:59:59+05:30', true, 'study', 'high',   'exams', 'HPC', ''),
('hpc-exam',   'HPC exam',                 '2026-06-02 23:59:59+05:30', true, 'exam',  'high',   'exams', 'HPC', ''),
('dl-prep-2',  'DL prep — final',          '2026-06-03 23:59:59+05:30', true, 'study', 'high',   'exams', 'DL',  ''),
('dl-exam',    'Deep Learning exam',       '2026-06-04 23:59:59+05:30', true, 'exam',  'high',   'exams', 'DL',  ''),
('nlp-prep-1', 'NLP prep',                 '2026-06-05 23:59:59+05:30', true, 'study', 'normal', 'exams', 'NLP', ''),
('nlp-prep-2', 'NLP prep',                 '2026-06-06 23:59:59+05:30', true, 'study', 'normal', 'exams', 'NLP', ''),
('nlp-prep-3', 'NLP prep — final',         '2026-06-07 23:59:59+05:30', true, 'study', 'high',   'exams', 'NLP', ''),
('bi-prep-1',  'BI prep',                  '2026-06-08 23:59:59+05:30', true, 'study', 'normal', 'exams', 'BI',  ''),
('nlp-exam',   'NLP exam',                 '2026-06-09 23:59:59+05:30', true, 'exam',  'high',   'exams', 'NLP', ''),
('bi-prep-2',  'BI prep — final',          '2026-06-10 23:59:59+05:30', true, 'study', 'high',   'exams', 'BI',  ''),
('bi-exam',    'BI exam',                  '2026-06-11 23:59:59+05:30', true, 'exam',  'high',   'exams', 'BI',  '')
on conflict (id) do nothing;
