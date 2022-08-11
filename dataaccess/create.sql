CREATE SCHEMA IF NOT EXISTS peppermintery;

DO $$ BEGIN
   CREATE TYPE peppermintery.token_state AS ENUM
     ('pending', 'processing', 'submitted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS peppermintery.requests
(
    id SERIAL,
	token_id INTEGER NULL,
    recipient_address character(36) COLLATE pg_catalog."default" NOT NULL,
    details jsonb NOT NULL,
	state peppermintery.token_state NOT NULL DEFAULT 'pending'::peppermintery.token_state,
	peppermint_id INTEGER NULL,
	submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT requests_pkey PRIMARY KEY (id),
	CONSTRAINT uq_token_id UNIQUE (token_id)
)
TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS peppermintery.assets
(
    id SERIAL,
    request_id integer NOT NULL,
    asset_role character varying(255) COLLATE pg_catalog."default" NOT NULL,
    mime_type character varying(255) COLLATE pg_catalog."default" NOT NULL,
    filename character varying(255) COLLATE pg_catalog."default" NOT NULL,
	submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT fk_request_asset FOREIGN KEY (request_id)
        REFERENCES peppermintery.requests (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
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
    ON peppermintery.requests
    FOR EACH ROW
    EXECUTE FUNCTION peppermintery.update_last_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TRIGGER update_tokens_last_updated_at
    BEFORE UPDATE
    ON peppermintery.assets
    FOR EACH ROW
    EXECUTE FUNCTION peppermintery.update_last_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;