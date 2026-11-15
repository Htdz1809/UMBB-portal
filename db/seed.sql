BEGIN;

INSERT INTO departments (name, description, head_of_department, contact_email)
VALUES
  (
    'Faculté des Sciences',
    'Six departments: Mathematics, Physics, Chemistry, Computer Science, Biology and Foreign Languages, with cells in agronomy, infotronics and sports science.',
    'Abdelhakim DAOUI, Dean',
    'a.daoui@univ-boumerdes.dz'
  ),
  (
    'Faculté de Technologie',
    'Eight departments covering process engineering, food technology, environmental engineering, mechanical engineering, energy, industrial maintenance, materials engineering and civil engineering.',
    'Mohamed SAIDI, Dean',
    'mo.saidi@univ-boumerdes.dz'
  ),
  (
    'Faculté des Hydrocarbures et de la Chimie',
    'Six departments spanning geophysics and earthquake engineering, mining and petroleum geology, hydrocarbon transport, chemical and pharmaceutical processes, automation, and hydrocarbon economics.',
    'Boudjema HAMADA, Dean',
    'bou.hamada@univ-boumerdes.dz'
  ),
  (
    'Faculté des Sciences Economiques, Commerciales et des Sciences de Gestion',
    'Three departments in Management Sciences, Commercial Sciences and Economic Sciences, with programmes in economics, management and finance.',
    'Ahmed DORBANE, Dean',
    'dorbaneahmed9@gmail.com'
  ),
  (
    'Faculté de Droit et des Sciences Politiques',
    'Three departments in Public Law, Private Law and Political Science, plus an Arabic language and literature cell, based at the Boudouaou campus.',
    'Abdeladhim BENSEGHIER, Dean',
    'a.benseghier@univ-boumerdes.dz'
  ),
  (
    'Faculté des Lettres et des Langues',
    'Three departments in Arabic Literature, French and English, based at the Boudouaou campus.',
    'Noureddine OULEBSIR, Dean',
    'n.oulebsir@univ-boumerdes.dz'
  ),
  (
    'Institut de Génie Electrique et Electronique',
    'Three departments in Basic Teaching, Electronics, and Automation and Electrotechnics, continuing the legacy of the former INELEC institute.',
    'Karim BAICHE, Director',
    'kbaiche@univ-boumerdes.dz'
  ),
  (
    'Institut des Sciences et Techniques Appliquées',
    'Applied science and technology programmes delivered at the Boumerdès campus, with a focus on professional and technical training.',
    'Hamid AKNOUCHE, Director',
    'hamidaknouche@univ-boumerdes.dz'
  )
ON CONFLICT (name) DO NOTHING;

INSERT INTO announcements (title, summary, body, category, published_at)
SELECT *
FROM (
  VALUES
    (
      '2026–2027 academic year: registration and key dates',
      'Registration and teaching information for the new academic year is available from the central registrar and academic units.',
      E'The 2026–2027 academic year is underway at UMBB. Students should consult their faculty or institute for programme-specific timetables, examination schedules and registration arrangements.\n\nThe central registrar''s office provides guidance on registration, academic documents and equivalence requests. Administrative contact details are listed in the university directory.',
      'Announcement',
      TIMESTAMPTZ '2026-11-12 09:00:00+00'
    ),
    (
      'UMBB research spans six faculties and two institutes',
      'Research and doctoral training cover science, technology, hydrocarbons, economics, law, languages and applied engineering.',
      E'The university''s research community is organised across laboratories, research units and doctoral programmes in its faculties and institutes.\n\nStudents interested in master''s or doctoral research should consult the relevant faculty or institute and the vice-rectorate for postgraduate studies and scientific research.',
      'News',
      TIMESTAMPTZ '2026-11-08 14:30:00+00'
    ),
    (
      'Library services support teaching and research',
      'The central library and faculty libraries provide reading rooms, digital resources and access to thesis archives.',
      E'UMBB''s library network includes the central library, faculty libraries and reading rooms across the campuses.\n\nStudents and researchers can use the university catalogue, national documentation platforms and the thesis archive to support their work. Opening hours are published by each library.',
      'Announcement',
      TIMESTAMPTZ '2026-11-05 08:15:00+00'
    ),
    (
      'Entrepreneurship and innovation support for student projects',
      'The Maison de l’Entrepreneuriat and the CATI support student projects, innovation and links with industry.',
      E'The Maison de l''Entrepreneuriat and the Centre d''Appui aux Technologies de l''Innovation support students and staff who wish to develop innovative projects.\n\nThe services are based at the Institut de Génie Electrique et Electronique and work with academic units across the university.',
      'Event',
      TIMESTAMPTZ '2026-10-30 12:00:00+00'
    ),
    (
      'International cooperation and mobility',
      'UMBB takes part in international partnerships and mobility programmes for students, teachers and researchers.',
      E'The vice-rectorate for external relations coordinates the university''s cooperation, partnership and mobility activities.\n\nStudents and staff can contact the service for exchange programmes and partnership opportunities. Information is also published by the faculties and institutes.',
      'News',
      TIMESTAMPTZ '2026-10-22 10:45:00+00'
    )
) AS seeded (title, summary, body, category, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM app_metadata WHERE key = 'initial_seed'
);

INSERT INTO app_metadata (key, value)
VALUES ('initial_seed', 'true')
ON CONFLICT (key) DO NOTHING;

COMMIT;
