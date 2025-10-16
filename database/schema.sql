-- Create the main database
CREATE DATABASE crawler_data;
\c crawler_data;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main crawl sessions table
CREATE TABLE crawl_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initial_url TEXT NOT NULL,
    final_url TEXT NOT NULL,
    timeout BOOLEAN DEFAULT FALSE,
    test_started BIGINT NOT NULL,
    test_finished BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fingerprints table
CREATE TABLE fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    total_calls INTEGER,
    total_time DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fingerprint calls table
CREATE TABLE fingerprint_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fingerprint_id UUID REFERENCES fingerprints(id) ON DELETE CASCADE,
    call_time DECIMAL(10,4),
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requests table
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    method VARCHAR(10),
    type VARCHAR(50),
    status INTEGER,
    size INTEGER,
    remote_ip_address INET,
    response_body_hash VARCHAR(64),
    redirected_to TEXT,
    redirected_from TEXT,
    request_time DECIMAL(10,4),
    wall_time DECIMAL(15,6),
    post_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request headers table
CREATE TABLE request_headers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    header_name VARCHAR(255) NOT NULL,
    header_value TEXT,
    is_request BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request initiators table
CREATE TABLE request_initiators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    initiator_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cookies table
CREATE TABLE cookies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    domain VARCHAR(255),
    path VARCHAR(500),
    expires BIGINT,
    session BOOLEAN DEFAULT FALSE,
    same_site VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ads table
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    ad_id VARCHAR(255),
    node_type VARCHAR(50),
    ad_class VARCHAR(500),
    inner_text TEXT,
    xpath TEXT,
    border_style VARCHAR(100),
    outer_html TEXT,
    x_position INTEGER,
    y_position INTEGER,
    width INTEGER,
    height INTEGER,
    intersects_view_port BOOLEAN,
    ad_index INTEGER,
    screenshot_path TEXT,
    clicked_ad_choice_link TEXT,
    ad_disclosure_text TEXT,
    ad_disclosure_page_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad links and images table
CREATE TABLE ad_links_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    frame_url TEXT,
    is_main_document BOOLEAN DEFAULT FALSE,
    parent_frame_url TEXT,
    frame_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad links table
CREATE TABLE ad_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_links_images_id UUID REFERENCES ad_links_images(id) ON DELETE CASCADE,
    goog_ad_url TEXT,
    href TEXT,
    outer_html TEXT,
    link_group INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad images table
CREATE TABLE ad_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_links_images_id UUID REFERENCES ad_links_images(id) ON DELETE CASCADE,
    x_position INTEGER,
    y_position INTEGER,
    width INTEGER,
    height INTEGER,
    src TEXT,
    outer_html TEXT,
    is_background BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad scripts table
CREATE TABLE ad_scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_links_images_id UUID REFERENCES ad_links_images(id) ON DELETE CASCADE,
    script_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad iframes table
CREATE TABLE ad_iframes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_links_images_id UUID REFERENCES ad_links_images(id) ON DELETE CASCADE,
    iframe_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMP (Consent Management Platforms) table
CREATE TABLE cmps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    vendor VARCHAR(255),
    description TEXT,
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CMP scripts table
CREATE TABLE cmp_scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cmp_id UUID REFERENCES cmps(id) ON DELETE CASCADE,
    script_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ad scrape results table
CREATE TABLE ad_scrape_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    n_detected_ads INTEGER,
    n_ads_scraped INTEGER,
    n_small_ads INTEGER,
    n_empty_ads INTEGER,
    n_removed_ads INTEGER,
    n_ad_disclosure_matched INTEGER,
    n_ad_disclosure_unmatched INTEGER,
    n_clicked_ad_choices INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots table
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES crawl_sessions(session_id) ON DELETE CASCADE,
    screenshot_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_crawl_sessions_initial_url ON crawl_sessions(initial_url);
CREATE INDEX idx_crawl_sessions_test_started ON crawl_sessions(test_started);
CREATE INDEX idx_requests_session_id ON requests(session_id);
CREATE INDEX idx_requests_url ON requests(url);
CREATE INDEX idx_cookies_session_id ON cookies(session_id);
CREATE INDEX idx_ads_session_id ON ads(session_id);
CREATE INDEX idx_fingerprints_session_id ON fingerprints(session_id);
CREATE INDEX idx_cmps_session_id ON cmps(session_id);