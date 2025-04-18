const tribute = new Tribute({
    collection: [
      {
        trigger: "@",
        menuItemTemplate: (item) =>
          `<div class="mention-item">
           <img src="${item.original.image}" width="24" height="24"/>
           <span>${item.string}</span>
         </div>`,
        selectTemplate: (item) =>
          `<span contenteditable="false" class="mention" data-mention-id="${item.original.value}">
           @${item.original.key}
         </span>&nbsp;`,
        values: [],
      },
    ],
  });
  