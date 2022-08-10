CREATE SCHEMA IF NOT EXISTS peppermintery;

DO $$ BEGIN
   CREATE TYPE peppermintery.token_state AS ENUM
     ('pending', 'processing', 'submitted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS peppermintery.tokens
(
    id SERIAL,
    recipient_address character(36) COLLATE pg_catalog."default" NOT NULL,
    details jsonb NOT NULL,
	state peppermintery.token_state NOT NULL DEFAULT 'pending'::peppermintery.token_state,
	peppermint_id INTEGER NULL,
	submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT tokens_pkey PRIMARY KEY (id)
)
TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS peppermintery.assets
(
    id integer NOT NULL DEFAULT nextval('peppermintery.assets_id_seq'::regclass),
    token_id integer NOT NULL,
    asset_role character varying(255) COLLATE pg_catalog."default" NOT NULL,
    mime_type character varying(255) COLLATE pg_catalog."default" NOT NULL,
    file_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT fk_token_asset_token FOREIGN KEY (token_id)
        REFERENCES peppermintery.tokens (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

CREATE OR REPLACE FUNCTION peppermintery.update_last_updated_at_column()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
   NEW.last_updated_at = now();
   RETURN NEW;
END;
$BODY$;

DO $$ BEGIN
CREATE TRIGGER update_tokens_last_updated_at
    BEFORE UPDATE
    ON peppermintery.tokens
    FOR EACH ROW
    EXECUTE FUNCTION peppermintery.update_last_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
