const fs = require("fs");
const path = require("path");
const pool = require("./dbConfig");

function parseHost(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch (_) {
    return null;
  }
}

function loadCategoriesMap(csvPath) {
  if (!csvPath) return new Map();
  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  const map = new Map();
  // Expect header: domain,categories
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split on first comma only, because categories can contain commas if ever extended
    const idx = line.indexOf(",");
    if (idx === -1) continue;
    const domain = line.slice(0, idx).trim();
    const catsRaw = line.slice(idx + 1).trim();
    if (!domain) continue;
    const categories = catsRaw
      ? catsRaw
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    map.set(domain.toLowerCase(), categories);
  }
  return map;
}

async function importFromJSON(jsonFilePath, csvMappingPath) {
  const data = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

  // Determine domain and categories
  const hostFromUrl = parseHost(data.initialUrl) || parseHost(data.finalUrl);
  const hostFromFilename = path.basename(jsonFilePath).split("_")[0];
  const domain = (hostFromUrl || hostFromFilename || "").toLowerCase() || null;
  const categoriesMap = loadCategoriesMap(csvMappingPath);
  const categories =
    domain && categoriesMap.has(domain) ? categoriesMap.get(domain) : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert session
    const sessionResult = await client.query(
      "INSERT INTO crawl_sessions (initial_url, final_url, timeout, test_started, test_finished, domain, categories) VALUES ($1, $2, $3, to_timestamp($4/1000), to_timestamp($5/1000), $6, $7) RETURNING session_id",
      [
        data.initialUrl,
        data.finalUrl,
        data.timeout,
        data.testStarted,
        data.testFinished,
        domain,
        categories,
      ]
    );
    const sessionId = sessionResult.rows[0].session_id;

    // Insert fingerprints
    if (data.data.fingerprints) {
      const fpResult = await client.query(
        "INSERT INTO fingerprints (session_id, total_calls, total_time) VALUES ($1, $2, $3) RETURNING id",
        [
          sessionId,
          data.data.fingerprints.callStats.calls,
          data.data.fingerprints.callStats.time,
        ]
      );
      const fpId = fpResult.rows[0].id;
      for (const call of data.data.fingerprints.savedCalls) {
        await client.query(
          "INSERT INTO fingerprint_calls (fingerprint_id, call_time, url) VALUES ($1, $2, $3)",
          [fpId, call.time, call.url]
        );
      }
    }

    // Insert requests
    if (data.data.requests) {
      for (const req of data.data.requests) {
        const reqResult = await client.query(
          "INSERT INTO requests (session_id, url, method, type, status, size, remote_ip_address, response_body_hash, redirected_to, redirected_from, request_time, wall_time, post_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id",
          [
            sessionId,
            req.url,
            req.method,
            req.type,
            req.status,
            req.size,
            req.remoteIPAddress,
            req.responseBodyHash,
            req.redirectedTo,
            req.redirectedFrom,
            req.requestTime,
            req.wallTime,
            req.postData,
          ]
        );
        const reqId = reqResult.rows[0].id;

        // Headers
        if (req.requestHeaders) {
          for (const [name, value] of Object.entries(req.requestHeaders)) {
            await client.query(
              "INSERT INTO request_headers (request_id, header_name, header_value, is_request) VALUES ($1, $2, $3, $4)",
              [reqId, name, value, true]
            );
          }
        }
        if (req.responseHeaders) {
          for (const [name, value] of Object.entries(req.responseHeaders)) {
            await client.query(
              "INSERT INTO request_headers (request_id, header_name, header_value, is_request) VALUES ($1, $2, $3, $4)",
              [reqId, name, value, false]
            );
          }
        }

        // Initiators
        if (req.initiators) {
          for (const init of req.initiators) {
            await client.query(
              "INSERT INTO request_initiators (request_id, initiator_url) VALUES ($1, $2)",
              [reqId, init.url]
            );
          }
        }
      }
    }

    // Insert cookies
    if (data.data.cookies) {
      for (const cookie of data.data.cookies) {
        await client.query(
          "INSERT INTO cookies (session_id, name, domain, path, expires, session, same_site) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            sessionId,
            cookie.name,
            cookie.domain,
            cookie.path,
            cookie.expires ? new Date(cookie.expires) : null,
            cookie.session,
            cookie.sameSite,
          ]
        );
      }
    }

    // Insert ads
    if (data.data.ads) {
      const scrape = data.data.ads.scrapeResults;
      await client.query(
        "INSERT INTO ad_scrape_results (session_id, n_detected_ads, n_ads_scraped, n_small_ads, n_empty_ads, n_removed_ads, n_ad_disclosure_matched, n_ad_disclosure_unmatched, n_clicked_ad_choices) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          sessionId,
          scrape.nDetectedAds,
          scrape.nAdsScraped,
          scrape.nSmallAds,
          scrape.nEmptyAds,
          scrape.nRemovedAds,
          scrape.nAdDisclosureMatched,
          scrape.nAdDisclosureUnmatched,
          scrape.nClickedAdChoices,
        ]
      );

      for (const ad of data.data.ads.ads) {
        const adResult = await client.query(
          "INSERT INTO ads (session_id, ad_id, node_type, ad_class, inner_text, xpath, border_style, outer_html, x_position, y_position, width, height, intersects_view_port, ad_index, screenshot_path, clicked_ad_choice_link, ad_disclosure_text, ad_disclosure_page_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id",
          [
            sessionId,
            ad.adId,
            ad.nodeType,
            ad.adClass,
            ad.innerText,
            ad.xpath,
            ad.borderStyle,
            ad.outerHTML,
            ad.xPosition,
            ad.yPosition,
            ad.width,
            ad.height,
            ad.intersectsViewPort,
            ad.adIndex,
            ad.screenshotPath,
            ad.clickedAdChoiceLink,
            ad.adDisclosureText,
            ad.adDisclosurePageUrl,
          ]
        );
        const adId = adResult.rows[0].id;

        // Links and images
        for (const li of ad.linksImages) {
          const liResult = await client.query(
            "INSERT INTO ad_links_images (ad_id, frame_url, is_main_document, parent_frame_url, frame_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [
              adId,
              li.frameUrl,
              li.isMainDocument,
              li.parentFrameUrl,
              li.frameId,
            ]
          );
          const liId = liResult.rows[0].id;

          for (const link of li.links) {
            await client.query(
              "INSERT INTO ad_links (ad_links_images_id, goog_ad_url, href, outer_html, link_group) VALUES ($1, $2, $3, $4, $5)",
              [liId, link.googAdUrl, link.href, link.outerHTML, link.linkGroup]
            );
          }

          for (const img of li.images) {
            await client.query(
              "INSERT INTO ad_images (ad_links_images_id, x_position, y_position, width, height, src, outer_html, is_background) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
              [
                liId,
                img.xPosition,
                img.yPosition,
                img.width,
                img.height,
                img.src,
                img.outerHTML,
                img.isBackground,
              ]
            );
          }

          for (const script of li.scripts) {
            await client.query(
              "INSERT INTO ad_scripts (ad_links_images_id, script_url) VALUES ($1, $2)",
              [liId, script]
            );
          }

          for (const iframe of li.iframes) {
            await client.query(
              "INSERT INTO ad_iframes (ad_links_images_id, iframe_url) VALUES ($1, $2)",
              [liId, iframe]
            );
          }
        }
      }
    }

    // Insert cmps
    if (data.data.cmps) {
      for (const cmp of data.data.cmps) {
        const cmpResult = await client.query(
          "INSERT INTO cmps (session_id, name, version, vendor, description, url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [
            sessionId,
            cmp.name,
            cmp.version,
            cmp.vendor,
            cmp.description,
            cmp.url,
          ]
        );
        const cmpId = cmpResult.rows[0].id;

        for (const script of cmp.detectedScripts) {
          await client.query(
            "INSERT INTO cmp_scripts (cmp_id, script_url) VALUES ($1, $2)",
            [cmpId, script]
          );
        }
      }
    }

    // Insert screenshots
    if (data.data.screenshots) {
      await client.query(
        "INSERT INTO screenshots (session_id, screenshot_path) VALUES ($1, $2)",
        [sessionId, data.data.screenshots]
      );
    }

    // Insert apis (if present)
    if (data.data.apis) {
      for (const [source, stats] of Object.entries(data.data.apis.stats)) {
        await client.query(
          "INSERT INTO api_call_stats (session_id, source, stats) VALUES ($1, $2, $3)",
          [sessionId, source, JSON.stringify(stats)]
        );
      }

      for (const call of data.data.apis.savedCalls) {
        await client.query(
          "INSERT INTO api_saved_calls (session_id, call_id, source, description, arguments) VALUES ($1, $2, $3, $4, $5)",
          [
            sessionId,
            call.callId,
            call.source,
            call.description,
            JSON.stringify(call.arguments),
          ]
        );
      }
    }

    // Insert targets
    if (data.data.targets) {
      for (const target of data.data.targets) {
        await client.query(
          "INSERT INTO targets (session_id, target_id, url, type) VALUES ($1, $2, $3, $4)",
          [sessionId, target.targetId, target.url, target.type]
        );
      }
    }

    // Insert links
    if (data.data.links) {
      for (const link of data.data.links) {
        await client.query(
          "INSERT INTO links (session_id, href, text, domain) VALUES ($1, $2, $3, $4)",
          [sessionId, link.href, link.text, link.domain]
        );
      }
    }

    // Insert videos
    if (data.data.videos) {
      for (const video of data.data.videos) {
        await client.query(
          "INSERT INTO videos (session_id, src, poster, controls) VALUES ($1, $2, $3, $4)",
          [sessionId, video.src, video.poster, video.controls]
        );
      }
    }

    // Insert elements
    if (data.data.elements) {
      await client.query(
        "INSERT INTO elements (session_id, present, visible) VALUES ($1, $2, $3)",
        [sessionId, data.data.elements.present, data.data.elements.visible]
      );
    }

    await client.query("COMMIT");
    console.log("Data imported successfully for session:", sessionId);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error importing data:", error);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const jsonFile = process.argv[2];
  const csvMap = process.argv[3];
  if (!jsonFile) {
    console.error(
      "Usage: node importFromJSON.js <jsonFilePath> [csvMappingPath]"
    );
    process.exit(1);
  }
  importFromJSON(jsonFile, csvMap);
}

module.exports = importFromJSON;
