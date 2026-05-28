
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, RANGE};
use tiny_http::{Header, Response, Server};
use std::time::Duration;
use std::thread;

pub fn start_video_proxy() {
    //let video_secret = uuid::Uuid::new_v4().to_string();
    //let secret_for_thread = video_secret.clone();

    thread::spawn(move || {
        let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap();

        let server = Server::http("127.0.0.1:11447").unwrap();

        for request in server.incoming_requests() {
            let raw_url = &request.url()[1..];
            let url = match urlencoding::decode(raw_url) {
                Ok(u) => u.into_owned(),
                  Err(_) => continue,
            };

            let range_header = request
            .headers()
            .iter()
            .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("Range"))
            .map(|h| h.value.as_str().to_string());

            let mut rb = client.get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Referer", "https://max.ru/");

            if let Some(ref r) = range_header {
                rb = rb.header(RANGE, r);
            }

            let res = match rb.send() {
                Ok(r) => r,
                  Err(e) => {
                      eprintln!("Ошибка запроса к источнику: {}", e);
                      let _ = request.respond(Response::from_string("Error").with_status_code(502));
                      continue;
                  }
            };

            let status = res.status().as_u16();

            let content_length_val = res
            .headers()
            .get(CONTENT_LENGTH)
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<usize>().ok());

            let content_type = res
            .headers()
            .get(CONTENT_TYPE)
            .map(|h| h.to_str().unwrap_or("video/mp4"))
            .unwrap_or("video/mp4");

            let mut headers = vec![
                Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap(),
                  Header::from_bytes(&b"Access-Control-Allow-Origin"[..], b"*").unwrap(),
                  Header::from_bytes(&b"Accept-Ranges"[..], b"bytes").unwrap(),
            ];

            if let Some(cl) = res.headers().get(CONTENT_LENGTH) {
                headers.push(Header::from_bytes(&b"Content-Length"[..], cl.as_bytes()).unwrap());
            }

            if let Some(cr) = res.headers().get(CONTENT_RANGE) {
                headers.push(Header::from_bytes(&b"Content-Range"[..], cr.as_bytes()).unwrap());
            }

            let response = Response::new(status.into(), headers, res, content_length_val, None);

            if let Err(e) = request.respond(response) {
                eprintln!("Ошибка отправки ответа: {}", e);
            }
        }
    });
}
