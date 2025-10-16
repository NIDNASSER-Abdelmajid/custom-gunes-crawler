const { pool, testConnection } = require("./pool");

class CrawlerDB {
  constructor() {
    this.pool = pool;
  }

  // Session Management
  async createCrawlSession(sessionData) {
    const {
      initialUrl,
      finalUrl,
      timeout = false,
      testStarted,
      testFinished,
    } = sessionData;

    const query = `
            INSERT INTO crawl_sessions (initial_url, final_url, timeout, test_started, test_finished)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING session_id
        `;

    const values = [initialUrl, finalUrl, timeout, testStarted, testFinished];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0].session_id;
    } catch (error) {
      console.error("Error creating crawl session:", error);
      throw error;
    }
  }

  // Fingerprint Data
  async saveFingerprints(sessionId, fingerprintsData) {
    const { callStats, savedCalls } = fingerprintsData;

    // Insert fingerprint stats
    const fingerprintQuery = `
            INSERT INTO fingerprints (session_id, total_calls, total_time)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

    const fingerprintResult = await this.pool.query(fingerprintQuery, [
      sessionId,
      callStats.calls,
      callStats.time,
    ]);

    const fingerprintId = fingerprintResult.rows[0].id;

    // Insert individual calls
    if (savedCalls && savedCalls.length > 0) {
      const callsQuery = `
                INSERT INTO fingerprint_calls (fingerprint_id, call_time, url)
                VALUES ($1, $2, $3)
            `;

      for (const call of savedCalls) {
        await this.pool.query(callsQuery, [fingerprintId, call.time, call.url]);
      }
    }

    return fingerprintId;
  }

  // Request Data
  async saveRequests(sessionId, requests) {
    for (const request of requests) {
      const requestQuery = `
                INSERT INTO requests (
                    session_id, url, method, type, status, size, remote_ip_address,
                    response_body_hash, redirected_to, redirected_from, request_time,
                    wall_time, post_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;

      const requestResult = await this.pool.query(requestQuery, [
        sessionId,
        request.url,
        request.method,
        request.type,
        request.status,
        request.size,
        request.remoteIPAddress,
        request.responseBodyHash,
        request.redirectedTo,
        request.redirectedFrom,
        request.time,
        request.wallTime,
        request.postData,
      ]);

      const requestId = requestResult.rows[0].id;

      // Save request headers
      if (request.requestHeaders) {
        await this.saveHeaders(requestId, request.requestHeaders, true);
      }

      // Save response headers
      if (request.responseHeaders) {
        await this.saveHeaders(requestId, request.responseHeaders, false);
      }

      // Save initiators
      if (request.initiators && request.initiators.length > 0) {
        await this.saveInitiators(requestId, request.initiators);
      }
    }
  }

  async saveHeaders(requestId, headers, isRequest) {
    const query = `
            INSERT INTO request_headers (request_id, header_name, header_value, is_request)
            VALUES ($1, $2, $3, $4)
        `;

    for (const [name, value] of Object.entries(headers)) {
      await this.pool.query(query, [requestId, name, value, isRequest]);
    }
  }

  async saveInitiators(requestId, initiators) {
    const query = `
            INSERT INTO request_initiators (request_id, initiator_url)
            VALUES ($1, $2)
        `;

    for (const initiator of initiators) {
      await this.pool.query(query, [requestId, initiator]);
    }
  }

  // Cookie Data
  async saveCookies(sessionId, cookies) {
    const query = `
            INSERT INTO cookies (
                session_id, name, domain, path, expires, session, same_site
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

    for (const cookie of cookies) {
      await this.pool.query(query, [
        sessionId,
        cookie.name,
        cookie.domain,
        cookie.path,
        cookie.expires,
        cookie.session,
        cookie.sameSite,
      ]);
    }
  }

  // Ad Data
  async saveAds(sessionId, adsData) {
    const { scrapeResults, adAttrs } = adsData;

    // Save scrape results
    await this.saveAdScrapeResults(sessionId, scrapeResults);

    // Save individual ads
    for (const ad of adAttrs) {
      const adQuery = `
                INSERT INTO ads (
                    session_id, ad_id, node_type, ad_class, inner_text, xpath,
                    border_style, outer_html, x_position, y_position, width,
                    height, intersects_view_port, ad_index, screenshot_path,
                    clicked_ad_choice_link, ad_disclosure_text, ad_disclosure_page_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id
            `;

      const adResult = await this.pool.query(adQuery, [
        sessionId,
        ad.id,
        ad.nodeType,
        ad.class,
        ad.innerText,
        ad.xpath,
        ad.borderStyle,
        ad.outerHTML,
        ad.x,
        ad.y,
        ad.width,
        ad.height,
        ad.intersectsViewPort,
        ad.index,
        ad.screenshot,
        ad.clickedAdChoiceLink,
        ad.adDisclosureText,
        ad.adDisclosurePageUrl,
      ]);

      const adId = adResult.rows[0].id;

      // Save ad links and images
      if (ad.adLinksAndImages) {
        await this.saveAdLinksAndImages(adId, ad.adLinksAndImages);
      }
    }
  }

  async saveAdScrapeResults(sessionId, scrapeResults) {
    const query = `
            INSERT INTO ad_scrape_results (
                session_id, n_detected_ads, n_ads_scraped, n_small_ads, n_empty_ads,
                n_removed_ads, n_ad_disclosure_matched, n_ad_disclosure_unmatched,
                n_clicked_ad_choices
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

    await this.pool.query(query, [
      sessionId,
      scrapeResults.nDetectedAds,
      scrapeResults.nAdsScraped,
      scrapeResults.nSmallAds,
      scrapeResults.nEmptyAds,
      scrapeResults.nRemovedAds,
      scrapeResults.nAdDisclosureMatched,
      scrapeResults.nAdDisclosureUnmatched,
      scrapeResults.nClickedAdChoices,
    ]);
  }

  async saveAdLinksAndImages(adId, linksAndImages) {
    for (const item of linksAndImages) {
      const linksImagesQuery = `
                INSERT INTO ad_links_images (
                    ad_id, frame_url, is_main_document, parent_frame_url, frame_id
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;

      const result = await this.pool.query(linksImagesQuery, [
        adId,
        item.frameUrl,
        item.isMainDocument,
        item.parentFrameUrl,
        item.frameId,
      ]);

      const linksImagesId = result.rows[0].id;

      // Save links
      if (item.links && item.links.length > 0) {
        for (const linkGroup of item.links) {
          for (const link of linkGroup) {
            await this.saveAdLink(linksImagesId, link, linkGroup.indexOf(link));
          }
        }
      }

      // Save images
      if (item.imgs && item.imgs.length > 0) {
        for (const img of item.imgs) {
          await this.saveAdImage(linksImagesId, img, false);
        }
      }

      // Save background images
      if (item.bgImgs && item.bgImgs.length > 0) {
        for (const bgImg of item.bgImgs) {
          await this.saveAdImage(linksImagesId, bgImg, true);
        }
      }

      // Save scripts
      if (item.scripts && item.scripts.length > 0) {
        for (const script of item.scripts) {
          await this.saveAdScript(linksImagesId, script);
        }
      }

      // Save iframes
      if (item.iframes && item.iframes.length > 0) {
        for (const iframe of item.iframes) {
          await this.saveAdIframe(linksImagesId, iframe);
        }
      }
    }
  }

  async saveAdLink(linksImagesId, link, groupIndex) {
    const query = `
            INSERT INTO ad_links (ad_links_images_id, goog_ad_url, href, outer_html, link_group)
            VALUES ($1, $2, $3, $4, $5)
        `;

    await this.pool.query(query, [
      linksImagesId,
      link.googAdUrl,
      link.href,
      link.outerHTML,
      groupIndex,
    ]);
  }

  async saveAdImage(linksImagesId, image, isBackground) {
    const query = `
            INSERT INTO ad_images (
                ad_links_images_id, x_position, y_position, width, height, src, outer_html, is_background
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

    await this.pool.query(query, [
      linksImagesId,
      image.x,
      image.y,
      image.width,
      image.height,
      image.src,
      image.outerHTML,
      isBackground,
    ]);
  }

  async saveAdScript(linksImagesId, scriptUrl) {
    const query = `
            INSERT INTO ad_scripts (ad_links_images_id, script_url)
            VALUES ($1, $2)
        `;

    await this.pool.query(query, [linksImagesId, scriptUrl]);
  }

  async saveAdIframe(linksImagesId, iframeUrl) {
    const query = `
            INSERT INTO ad_iframes (ad_links_images_id, iframe_url)
            VALUES ($1, $2)
        `;

    await this.pool.query(query, [linksImagesId, iframeUrl]);
  }

  // CMP Data
  async saveCMPs(sessionId, cmps) {
    for (const cmp of cmps) {
      const cmpQuery = `
                INSERT INTO cmps (session_id, name, version, vendor, description, url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `;

      const cmpResult = await this.pool.query(cmpQuery, [
        sessionId,
        cmp.name,
        cmp.version,
        cmp.vendor,
        cmp.description,
        cmp.url,
      ]);

      const cmpId = cmpResult.rows[0].id;

      // Save CMP scripts
      if (cmp.detectedScripts && cmp.detectedScripts.length > 0) {
        for (const script of cmp.detectedScripts) {
          await this.saveCMPScript(cmpId, script);
        }
      }
    }
  }

  async saveCMPScript(cmpId, scriptUrl) {
    const query = `
            INSERT INTO cmp_scripts (cmp_id, script_url)
            VALUES ($1, $2)
        `;

    await this.pool.query(query, [cmpId, scriptUrl]);
  }

  // Screenshots
  async saveScreenshot(sessionId, screenshotPath) {
    const query = `
            INSERT INTO screenshots (session_id, screenshot_path)
            VALUES ($1, $2)
        `;

    await this.pool.query(query, [sessionId, screenshotPath]);
  }

  // Main function to save complete crawl data
  async saveCrawlData(crawlData) {
    const { initialUrl, finalUrl, timeout, testStarted, testFinished, data } =
      crawlData;

    try {
      // Start transaction
      const client = await this.pool.connect();

      try {
        await client.query("BEGIN");

        // Create session
        const sessionId = await this.createCrawlSessionWithClient(client, {
          initialUrl,
          finalUrl,
          timeout,
          testStarted,
          testFinished,
        });

        // Save fingerprints
        if (data.fingerprints) {
          await this.saveFingerprintsWithClient(
            client,
            sessionId,
            data.fingerprints
          );
        }

        // Save requests
        if (data.requests) {
          await this.saveRequestsWithClient(client, sessionId, data.requests);
        }

        // Save cookies
        if (data.cookies) {
          await this.saveCookiesWithClient(client, sessionId, data.cookies);
        }

        // Save ads
        if (data.ads) {
          await this.saveAdsWithClient(client, sessionId, data.ads);
        }

        // Save CMPs
        if (data.cmps) {
          await this.saveCMPsWithClient(client, sessionId, data.cmps);
        }

        // Save screenshot
        if (data.screenshots) {
          await this.saveScreenshotWithClient(
            client,
            sessionId,
            data.screenshots
          );
        }

        await client.query("COMMIT");
        console.log(
          `✅ Successfully saved crawl data for session: ${sessionId}`
        );
        return sessionId;
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error saving crawl data:", error);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }

  // Client-based versions for transaction support
  async createCrawlSessionWithClient(client, sessionData) {
    const query = `
            INSERT INTO crawl_sessions (initial_url, final_url, timeout, test_started, test_finished)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING session_id
        `;
    const values = [
      sessionData.initialUrl,
      sessionData.finalUrl,
      sessionData.timeout,
      sessionData.testStarted,
      sessionData.testFinished,
    ];
    const result = await client.query(query, values);
    return result.rows[0].session_id;
  }

  // Query methods for retrieving data
  async getCrawlSession(sessionId) {
    const query = "SELECT * FROM crawl_sessions WHERE session_id = $1";
    const result = await this.pool.query(query, [sessionId]);
    return result.rows[0];
  }

  async getCrawlSessions(limit = 100) {
    const query =
      "SELECT * FROM crawl_sessions ORDER BY test_started DESC LIMIT $1";
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  async getRequestsBySession(sessionId) {
    const query =
      "SELECT * FROM requests WHERE session_id = $1 ORDER BY request_time";
    const result = await this.pool.query(query, [sessionId]);
    return result.rows;
  }

  async getAdsBySession(sessionId) {
    const query = "SELECT * FROM ads WHERE session_id = $1 ORDER BY ad_index";
    const result = await this.pool.query(query, [sessionId]);
    return result.rows;
  }

  // Close connection
  async close() {
    await this.pool.end();
  }
}

module.exports = new CrawlerDB();
