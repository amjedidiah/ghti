-- GHTI's programmes are Certificate, Ordinary Diploma and Post Graduate Diploma
-- in Theology (client input #7, 16 Nov 2026). There is no Degree, so the
-- `degree` level becomes `postgraduate_diploma`. Renaming keeps existing rows
-- valid: any programme stored as `degree` is now `postgraduate_diploma`.

alter type public.programme_level rename value 'degree' to 'postgraduate_diploma';
