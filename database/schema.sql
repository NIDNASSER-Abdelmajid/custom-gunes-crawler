-- Session management
CREATE TABLE IF NOT EXISTS crawl_sessions (
    session_id SERIAL PRIMARY KEY,
    initial_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    timeout BOOLEAN DEFAULT FALSE,
    test_started TIMESTAMP NOT NULL,
    test_finished TIMESTAMP NOT NULL
);

-- Fingerprint data
CREATE TABLE IF NOT EXISTS fingerprints (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    total_calls INTEGER,
    total_time DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS fingerprint_calls (
    id SERIAL PRIMARY KEY,
    fingerprint_id INTEGER REFERENCES fingerprints(id),
    call_time DOUBLE PRECISION,
    url TEXT
);

-- Request data
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    url TEXT NOT NULL,
    method TEXT,
    type TEXT,
    status INTEGER,
    size INTEGER,
    remote_ip_address TEXT,
    response_body_hash TEXT,
    redirected_to TEXT,
    redirected_from TEXT,
    request_time DOUBLE PRECISION,
    wall_time DOUBLE PRECISION,
    post_data TEXT
);

CREATE TABLE IF NOT EXISTS request_headers (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id),
    header_name TEXT,
    header_value TEXT,
    is_request BOOLEAN
);

CREATE TABLE IF NOT EXISTS request_initiators (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id),
    initiator_url TEXT
);

-- Cookie data
CREATE TABLE IF NOT EXISTS cookies (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    name TEXT,
    domain TEXT,
    path TEXT,
    expires TIMESTAMP,
    session BOOLEAN,
    same_site TEXT
);

-- Ad data
CREATE TABLE IF NOT EXISTS ad_scrape_results (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    n_detected_ads INTEGER,
    n_ads_scraped INTEGER,
    n_small_ads INTEGER,
    n_empty_ads INTEGER,
    n_removed_ads INTEGER,
    n_ad_disclosure_matched INTEGER,
    n_ad_disclosure_unmatched INTEGER,
    n_clicked_ad_choices INTEGER
);

CREATE TABLE IF NOT EXISTS ads (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    ad_id TEXT,
    node_type TEXT,
    ad_class TEXT,
    inner_text TEXT,
    xpath TEXT,
    border_style TEXT,
    outer_html TEXT,
    x_position INTEGER,
    y_position INTEGER,
    width INTEGER,
    height INTEGER,
    intersects_view_port BOOLEAN,
    ad_index INTEGER,
    screenshot_path TEXT,
    clicked_ad_choice_link BOOLEAN,
    ad_disclosure_text TEXT,
    ad_disclosure_page_url TEXT
);

CREATE TABLE IF NOT EXISTS ad_links_images (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER REFERENCES ads(id),
    frame_url TEXT,
    is_main_document BOOLEAN,
    parent_frame_url TEXT,
    frame_id TEXT
);

CREATE TABLE IF NOT EXISTS ad_links (
    id SERIAL PRIMARY KEY,
    ad_links_images_id INTEGER REFERENCES ad_links_images(id),
    goog_ad_url TEXT,
    href TEXT,
    outer_html TEXT,
    link_group INTEGER
);

CREATE TABLE IF NOT EXISTS ad_images (
    id SERIAL PRIMARY KEY,
    ad_links_images_id INTEGER REFERENCES ad_links_images(id),
    x_position INTEGER,
    y_position INTEGER,
    width INTEGER,
    height INTEGER,
    src TEXT,
    outer_html TEXT,
    is_background BOOLEAN
);

CREATE TABLE IF NOT EXISTS ad_scripts (
    id SERIAL PRIMARY KEY,
    ad_links_images_id INTEGER REFERENCES ad_links_images(id),
    script_url TEXT
);

CREATE TABLE IF NOT EXISTS ad_iframes (
    id SERIAL PRIMARY KEY,
    ad_links_images_id INTEGER REFERENCES ad_links_images(id),
    iframe_url TEXT
);

-- CMP data
CREATE TABLE IF NOT EXISTS cmps (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    name TEXT,
    version TEXT,
    vendor TEXT,
    description TEXT,
    url TEXT
);

CREATE TABLE IF NOT EXISTS cmp_scripts (
    id SERIAL PRIMARY KEY,
    cmp_id INTEGER REFERENCES cmps(id),
    script_url TEXT
);

-- Screenshots
CREATE TABLE IF NOT EXISTS screenshots (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    screenshot_path TEXT
);

-- API call data (from APICallCollector)
CREATE TABLE IF NOT EXISTS api_call_stats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    source TEXT,
    stats JSONB
);

CREATE TABLE IF NOT EXISTS api_saved_calls (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    call_id INTEGER,
    source TEXT,
    description TEXT,
    arguments JSONB
);

-- Target data (from TargetCollector)
CREATE TABLE IF NOT EXISTS targets (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    target_id INTEGER,
    url TEXT,
    type TEXT
);

-- Link data (from LinkCollector)
CREATE TABLE IF NOT EXISTS links (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    href TEXT,
    text TEXT,
    domain TEXT
);

-- Video data (from VideoCollector)
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    src TEXT,
    poster TEXT,
    controls BOOLEAN
);

-- Element data (general elements, e.g., from DOM analysis)
CREATE TABLE IF NOT EXISTS elements (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES crawl_sessions(session_id),
    present TEXT[],
    visible TEXT[]
);
