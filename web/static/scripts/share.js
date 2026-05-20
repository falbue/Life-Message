document.getElementById("shareButton").addEventListener("click", function () {

  if (navigator.share) {
    navigator
      .share({
        title: "life message",
        text: "Приглашение в чат\n",
        url: window.location.href,
      })
      .then(() => {
        notification("Ссылка скопирована в буфер обмена!");
        document.body.appendChild(notification);
      })
      .catch((error) => {
        notification("Ошибка при попытке поделиться", error);
      });
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = window.location.href;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    notification("Ссылка скопирована в буфер обмена!");
  }
});
