CREATE SCHEMA IF NOT EXISTS peppermintery;

DO $$ BEGIN
   CREATE TYPE peppermintery.request_state AS ENUM
     ('pending', 'processing', 'submitted', 'rejected', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS peppermintery.requests
(
    id SERIAL,
	token_id INTEGER NULL,
    details jsonb NULL,
	state peppermintery.request_state NOT NULL DEFAULT 'pending'::peppermintery.request_state,
	peppermint_id INTEGER NULL,
	submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT create_requests_pkey PRIMARY KEY (id),
	CONSTRAINT uq_token_id UNIQUE (token_id)
);

CREATE TABLE IF NOT EXISTS peppermintery.assets
(
    id SERIAL,
    request_id integer NOT NULL,
    asset_role character varying(255) NOT NULL,
    mime_type character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
	submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT assets_pkey PRIMARY KEY (id),
    CONSTRAINT fk_request_asset FOREIGN KEY (request_id)
        REFERENCES peppermintery.requests (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS peppermintery.recipients
(
    id SERIAL,
    request_id INTEGER NOT NULL,
    address character(36) NOT NULL,
    amount integer NOT NULL,
	state peppermintery.request_state NOT NULL DEFAULT 'pending'::peppermintery.request_state,
    peppermint_id INTEGER NULL,
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
	last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT mint_requests_pkey PRIMARY KEY (id),
    CONSTRAINT fk_request_recipients FOREIGN KEY (request_id)
        REFERENCES peppermintery.requests (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS peppermintery.processes
(
    originator character(36),
    process_uuid character(36) NOT NULL,
    messages jsonb NOT NULL DEFAULT '{}',
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT processes_pkey PRIMARY KEY (process_uuid)
);

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

DO $$ BEGIN
CREATE TRIGGER update_tokens_last_updated_at
    BEFORE UPDATE
    ON peppermintery.recipients
    FOR EACH ROW
    EXECUTE FUNCTION peppermintery.update_last_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TRIGGER update_tokens_last_updated_at
    BEFORE UPDATE
    ON peppermintery.processes
    FOR EACH ROW
    EXECUTE FUNCTION peppermintery.update_last_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;