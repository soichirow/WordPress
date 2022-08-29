//https://script.google.com/u/0/home/projects/1Ux-Nl2126IhXGZ-802SURs2qr_62w4PZlWffdHRJ7LTAzJdCV8Wqd6u3/edit
function testTagCategory() {
  const wordPress = new WordPress()
  console.log(wordPress.getTagIdList(["未分類", "ニュース"]))
  console.log(wordPress.getCategoryIdList(["未分類", "ニュース"]))
}

function testWPPOST() {
  const wordPress = new WordPress()
  //title, content, date, status, postId, slug, tagList, categoryList, featured_media, isSticky = false
  const date = Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'")
  console.log(wordPress.post("タイトル", "content", date, "draft", "", "", ["未分類"], ["未分類"], "", false))

}
function testWPImage() {
  const wordPress = new WordPress()
  const imageUrl = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png"
  const fileName = "google.png"
  const resObject = wordPress.postImagebyUrl(imageUrl, fileName)
  Logger.log(wordPress.postImagebyUrl(imageUrl, fileName))
  const id = resObject["id"]
  const url = resObject.source_url
  console.log(id)
  console.log(url)
}


/**

 */
function testEntryClass() {
  const postDate = Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'")
  const wordPressValueObject = {
    'title': "タイトル",
    'content': "content",
    'status': "draft",
    'slug': "",
    'date':postDate
  }
  const wordPress = new WordPress(wordPressValueObject)
  wordPress.post()


}


class WordPress {
  /**
   * @param {WordPressPostValue} - wordPressPostValue ワードプレスに投稿するために必要なパラメータを入力するvalueObject
   */
  constructor({
    title,
    content,
    date,
    status = "draft",
    postId = "",
    slug,
    tagList = [],
    categoryList = [],
    featured_media,
    isSticky = false
  }) {

    /**
     * 
     */
    if (Array.isArray(tagList) === false) throw "tagList は配列で指定してください"
    if (Array.isArray(categoryList) === false) throw "categoryList は配列で指定してください"
    if (["publish", "future", "draft", "pending", "private"].includes(status) === false) throw "statusはpublish, future, draft, pending, privateを指定してください"

    this.wordPressPostValue = {
      title: title,
      content: content,
      date: date,
      status: status,
      postId: postId,
      slug: slug,
      tagList: this.getTagIdList(tagList),
      categoryList: this.getTagIdList(categoryList),
      featured_media: featured_media,
      isSticky: isSticky,
    }

    this.baseUrl = PropertiesService.getScriptProperties().getProperty("WP_SITE_URL");
    this.userName = PropertiesService.getScriptProperties().getProperty("WP_USER_NAME");
    this.pass = PropertiesService.getScriptProperties().getProperty("WP_ACCESS_TOKEN");

    this.codic = new Codic()
  }
  /**
   * @return {}
   */
  post() {

    const postUrl = this.wordPressPostValue.postId === "" ? this.baseUrl + 'wp-json/wp/v2/posts' : this.baseUrl + 'wp-json/wp/v2/posts/' + this.wordPressPostValue.postId
    const payload = this.wordPressPostValue
    //不要なパラメータを削除しないとエラーになる
    const entries = Object.entries(payload)
    for (const [key, value] of entries) {
      if(value === undefined) delete payload[key]
    }

    const options = this.getOptions_(payload)

    const response = UrlFetchApp.fetch(postUrl, options);
    const resObject = JSON.parse(response.getContentText());
    Logger.log('ワードプレスに投稿を試みました ID: ' + resObject.id)
    return resObject
  }

  /**
   * タグのIDを取得する
   * @param {array.<string>}
   * @return {string}
   */
  getTagIdList(tagList) {
    const url = this.baseUrl + 'wp-json/wp/v2/tags';
    const tagIdList = tagList.map(tagName => {
      const slug = this.codic.get(tagName).replace(/_/g, "")
      const payload = {
        'name': tagName,
        'slug': slug,
      }
      const options = this.getOptions_(payload)
      const response = UrlFetchApp.fetch(url, options);
      const resObject = JSON.parse(response.getContentText());
      const tagId = (resObject["id"]) ? Number(resObject["id"]) : resObject["data"]["term_id"]
      return tagId
    })

    return tagIdList.join()
  }
  /**
   * CategoryのIDを取得する｡
   * @param {array.<string>}
   * @return {string}
   */
  getCategoryIdList(categoryList) {
    const url = this.baseUrl + 'wp-json/wp/v2/categories';
    const categoryIdList = categoryList.map(categoryName => {
      const slug = this.codic.get(categoryName).replace(/_/g, "")
      const payload = {
        'name': categoryName,
        'slug': slug,
      }
      const options = this.getOptions_(payload)
      const response = UrlFetchApp.fetch(url, options);
      const resObject = JSON.parse(response.getContentText());
      const tagId = (resObject["id"]) ? Number(resObject["id"]) : resObject["data"]["term_id"]
      return tagId
    })

    return categoryIdList.join()
  }
  /**
   * @param {string} - imageUrl 
   * @param {string} - fileName .png まで含めること
   * @return {object} - resObject
   */
  postImagebyUrl(imageUrl, fileName) {
    const url = this.baseUrl + 'wp-json/wp/v2/media';

    const payload = UrlFetchApp.fetch(imageUrl).getBlob();
    const options = this.getImageOptions_(fileName, payload);
    const response = UrlFetchApp.fetch(url, options);
    const resObject = JSON.parse(response.getContentText());
    return resObject
  }
  /**
   * @param {blob} - blob 
   * @param {string} - fileName .png まで含めること
   * @return {object} - resObject
   */
  postImagebyBlob(blob, fileName) {
    const url = this.baseUrl + 'wp-json/wp/v2/media';

    const payload = blob
    const options = this.getImageOptions_(fileName, payload);
    const response = UrlFetchApp.fetch(url, options);
    const resObject = JSON.parse(response.getContentText());

    return resObject
  }


  /**
   * @param {string} - payload
   * @return {object} - options
   */
  getOptions_(payload) {
    const options = {
      'method': "POST",
      'headers': { 'Authorization': 'Basic ' + Utilities.base64Encode(this.userName + ':' + this.pass) },
      'payload': payload,
      'muteHttpExceptions': true
    };
    return options
  }
  /**
   * @param {string} - filename
   * @param {string} - payload
   * @return {object} - options
   */
  getImageOptions_(fileName, payload) {
    const headers = {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment;filename=' + fileName,
      'accept': 'application/json',
      'Authorization': 'Basic ' + Utilities.base64Encode(this.userName + ':' + this.pass)
    };
    const options = {
      'method': 'POST',
      'muteHttpExceptions': true,
      'headers': headers,
      'payload': payload
    };
    return options
  }
}

function testCodic() {
  const codic = new Codic()
  const name = "未分類"
  Logger.log(codic.get(name))
  Logger.log(codic.showProjectId())

}
//https://codic.jp/my/api_status
/**
 * 
 * Note : https://codic.jp/my/api_status
 */
class Codic {
  constructor() {
    this.baseUrl = "https://api.codic.jp"
    this.token = PropertiesService.getScriptProperties().getProperty("CODIC_TOKEN");
    this.projectId = PropertiesService.getScriptProperties().getProperty("CODIC_PROJECT_ID");
  }
  /**
   * 
   */
  get(text) {
    const url = this.baseUrl + "/v1/engine/translate.json"
    const payload = {
      text: text,
      project_id: this.projectId,
      casing: "lower underscore",
      acronym_style: "camel strict"
    }
    const options = this.getOptions_(payload)
    const response = UrlFetchApp.fetch(url, options);
    const resObject = JSON.parse(response.getContentText());
    const translatedText = resObject[0].translated_text
    return translatedText
  }
  /**
   * 
   */
  showProjectId() {
    const url = this.baseUrl + "/v1/user_projects.json"
    const payload = {

    }
    const options = this.getOptions_(payload)
    const response = UrlFetchApp.fetch(url, options);
    const resObject = JSON.parse(response.getContentText());
    return resObject
  }

  /**
   * 
   */
  getOptions_(payload) {

    const options = {
      'method': "POST",
      'headers': { Authorization: ` Bearer ${this.token}` },
      'payload': payload,
      'muteHttpExceptions': true
    };
    return options
  }
}









