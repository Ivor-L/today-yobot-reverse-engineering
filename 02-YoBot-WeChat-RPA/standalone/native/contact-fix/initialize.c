#include <mach-o/dyld.h>
#include <string.h>
extern void yobot_install_contact_fix(void *, void *, void *);
extern void yobot_parse_contact(void);
extern void yobot_read_remark(void);
__attribute__((constructor)) static void install(void) {
    for (unsigned i = 0; i < _dyld_image_count(); i++) {
        const char *name = _dyld_get_image_name(i);
        const char *leaf = strrchr(name, '/'); leaf = leaf ? leaf + 1 : name;
        if (!strcmp(leaf, "YokoRpaDistributionHelper") || !strcmp(leaf, "yobot-parser-test.dylib")) {
            yobot_install_contact_fix((void *)_dyld_get_image_header(i), (void *)&yobot_parse_contact, (void *)&yobot_read_remark);
            return;
        }
    }
}
