$(document).ready(() => {
  tribute.attach(document.getElementById("post-editor"));
  fetchGraphQL(FETCH_CONTACTS_QUERY).then((res) => {
    const contacts = res.data.calcContacts;
    tribute.collection[0].values = contacts.map((c) => ({
      key: c.Display_Name || "Anonymous",
      value: c.Contact_ID,
      image: c.Profile_Image,
    }));
  });

  connect();
});
