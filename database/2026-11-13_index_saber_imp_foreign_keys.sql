-- Cover foreign keys used by cascades and joins in printed assessment flows.
CREATE INDEX IF NOT EXISTS saber_imp_teacher_id_idx ON public.saber_imp (teacher_id);
CREATE INDEX IF NOT EXISTS saber_imp_items_question_id_idx ON public.saber_imp_items (question_id);
CREATE INDEX IF NOT EXISTS saber_imp_results_roster_id_idx ON public.saber_imp_results (roster_id);
